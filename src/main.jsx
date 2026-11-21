import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Markdown from './Markdown.jsx';
import noteIndex from './generated/index.json';
import './styles.css';

const noteModules = import.meta.glob('./generated/notes/*.json', { eager: true, import: 'default' });
const notes = noteIndex.map(note => ({ ...note, content: noteModules[`./generated/notes/${note.id}.json`].content }));
const overview = notes.find(note => note.isOverview);
const lessons = notes.filter(note => !note.isOverview);
const byId = new Map(notes.map(note => [note.id, note]));
const byPath = new Map(notes.map(note => [note.path.replace(/\.md$/i, '').toLowerCase(), note]));
const byTitle = new Map(notes.map(note => [note.title.toLowerCase(), note]));
const readingMinutes = (note) => Math.max(1, Math.ceil(note.wordCount / 220));

function slugify(value) {
  return value.toLowerCase().replace(/&[a-z]+;/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
}
function noteNumber(note) { return note.title.match(/^\d+(?:\.\d+)?/)?.[0] || ''; }
function displayTitle(note) { return note.title.replace(/^\d+(?:\.\d+)?\s*/, ''); }
function currentLocation() {
  const match = location.hash.match(/^#note\/([^/]+)(?:\/(.*))?$/);
  return { id: match?.[1] && byId.has(match[1]) ? match[1] : null, section: match?.[2] ? decodeURIComponent(match[2]) : null };
}
function resolveWiki(path) {
  const trimmed = path.replace(/\.md$/i, '').replace(/^Notes\/Backend from First Principles\//i, '').replace(/^Backend from First Principles\//i, '');
  const found = byPath.get(trimmed.toLowerCase()) || byTitle.get(trimmed.split('/').at(-1).toLowerCase());
  return found;
}
function prepareMarkdown(content, note) {
  return content
    .replace(/^# .+\n+/, '')
    .replace(/^> \[!(\w+)\](.*)$/gm, (_, kind, rest) => `> **${kind[0].toUpperCase() + kind.slice(1)}${rest ? ` · ${rest.trim()}` : ''}**`)
    .replace(/!?\[\[([^\]]+)\]\]/g, (full, inner) => {
      const [target, label] = inner.split('|');
      const [targetPath, section] = target.split('#');
      const linked = targetPath ? resolveWiki(targetPath) : note;
      const text = (label || section || targetPath.split('/').at(-1)).replace(/[\[\]]/g, '');
      if (!linked) return text;
      const href = `#note/${linked.id}${section ? `/${encodeURIComponent(slugify(section))}` : ''}`;
      return `[${text.replace(/[\[\]]/g, '')}](${href})`;
    });
}
function getHeadings(content) {
  const withoutCode = content.replace(/```[\s\S]*?```/g, '');
  return [...withoutCode.matchAll(/^(#{2,3})\s+(.+)$/gm)].map(([, level, text]) => ({ level: level.length, text: text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/[*_`]/g, ''), id: slugify(text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/[*_`]/g, '')) }));
}
function Icon({ name, size = 19 }) {
  const paths = {
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="M5 5l14 14M19 5 5 19"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function App() {
  const [locationState, setLocationState] = useState(currentLocation);
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completed, setCompleted] = useState(() => { try { return JSON.parse(localStorage.getItem('bfp-completed') || '[]'); } catch { return []; } });
  const selected = locationState.id ? byId.get(locationState.id) : null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? lessons.filter(note => `${note.title} ${note.tags.join(' ')} ${note.content}`.toLowerCase().includes(q)) : lessons;
  }, [query]);

  useEffect(() => {
    const onHash = () => setLocationState(currentLocation());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (locationState.section) {
      requestAnimationFrame(() => document.getElementById(locationState.section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } else window.scrollTo(0, 0);
    setSidebarOpen(false);
  }, [locationState]);
  useEffect(() => { localStorage.setItem('bfp-completed', JSON.stringify(completed)); }, [completed]);
  useEffect(() => {
    const shortcut = event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.getElementById('note-search')?.focus(); } };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  const navigate = (id, section = '') => {
    const hash = id ? `#note/${id}${section ? `/${encodeURIComponent(section)}` : ''}` : '#';
    if (location.hash === hash) { setLocationState({ id, section }); window.scrollTo(0, 0); }
    else location.hash = hash;
  };
  const toggleCompleted = (id) => setCompleted(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const selectedIndex = selected ? lessons.findIndex(note => note.id === selected.id) : -1;
  const headings = selected ? getHeadings(selected.content) : [];
  return <div className="app-shell">
    <div className={`mobile-scrim ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="brand-row"><button className="brand" onClick={() => navigate(null)} aria-label="Go to overview"><span className="brand-icon"><Icon name="layers" size={21}/></span><span>first<span className="brand-accent">principles</span><small>BACKEND NOTES</small></span></button><button className="mobile-close icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><Icon name="close"/></button></div>
      <div className="sidebar-body">
        <div className="sidebar-label">LIBRARY</div>
        <button className={`sidebar-link overview-link ${!selected ? 'active' : ''}`} onClick={() => navigate(null)}><Icon name="book" size={17}/><span>Overview</span></button>
        <div className="sidebar-section"><span>THE COURSE</span><span>{lessons.length} lessons</span></div>
        <nav className="lesson-nav" aria-label="Lessons">{filtered.map(note => <button key={note.id} className={`lesson-link ${selected?.id === note.id ? 'active' : ''}`} onClick={() => navigate(note.id)} title={note.title}><span className="lesson-index">{noteNumber(note)}</span><span className="lesson-name">{displayTitle(note)}</span>{completed.includes(note.id) && <span className="lesson-done" aria-label="Completed"><Icon name="check" size={13}/></span>}</button>)}</nav>
        {filtered.length === 0 && <div className="sidebar-no-results">No lessons found</div>}
      </div>
      <div className="sidebar-footer"><div className="progress-row"><span>Your progress</span><strong>{completed.length} of {lessons.length}</strong></div><div className="progress-track"><div style={{ width: `${completed.length / lessons.length * 100}%` }}/></div><p>Learn one concept at a time.</p></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Icon name="menu"/></button><span className="topbar-breadcrumb">Backend from First Principles</span>{selected && <><Icon name="chevron" size={14}/><strong>{displayTitle(selected)}</strong></>}</div><div className="search-box"><Icon name="search" size={17}/><input id="note-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search lessons..." aria-label="Search lessons"/><kbd>⌘ K</kbd></div></header>
      {!selected ? <div className="overview-page">
        <div className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> A PERSONAL LEARNING LIBRARY</div><h1>Backend from<br/><em>First Principles.</em></h1><p>Clear, connected notes on the ideas behind modern backend systems. Start at the beginning or jump into any topic.</p><div className="hero-actions"><button className="primary-button" onClick={() => navigate(lessons[0].id)}>Start reading <Icon name="chevron" size={16}/></button><span><Icon name="book" size={17}/> {lessons.length} lessons</span><span><Icon name="clock" size={17}/> ~{lessons.reduce((sum, note) => sum + readingMinutes(note), 0)} min total</span></div></div><div className="hero-graphic" aria-hidden="true"><div className="graphic-orbit orbit-one"/><div className="graphic-orbit orbit-two"/><div className="graphic-core"><Icon name="layers" size={47}/></div><span className="graphic-point point-one"/><span className="graphic-point point-two"/><span className="graphic-point point-three"/></div></div>
        <div className="content-intro"><div><span className="section-kicker">EXPLORE THE COLLECTION</span><h2>Lessons, in order.</h2><p>Follow the full path or pick up where you left off.</p></div><span className="lesson-total">{filtered.length} {filtered.length === 1 ? 'lesson' : 'lessons'}</span></div>
        <div className="lesson-grid">{filtered.map(note => <button className="lesson-card" key={note.id} onClick={() => navigate(note.id)}><div className="card-top"><span className="card-number">{noteNumber(note)}</span>{completed.includes(note.id) && <span className="card-complete"><Icon name="check" size={14}/> Done</span>}</div><h3>{displayTitle(note)}</h3><p>{note.summary}</p><div className="card-footer"><span><Icon name="clock" size={15}/> {readingMinutes(note)} min read</span><span className="card-open"><Icon name="chevron" size={18}/></span></div></button>)}</div>
        {filtered.length === 0 && <div className="no-results">No lessons match “{query}”. Try another search.</div>}
        <section className="collection-source"><div><span className="section-kicker">ABOUT THESE NOTES</span><p>{overview.summary}</p></div><div className="markdown-body"><Markdown content={overview.content.split('## Source')[1] ? `## Source${overview.content.split('## Source')[1]}` : ''} navigate={navigate}/></div></section>
      </div> : <div className="reader-layout"><article className="reader"><div className="reader-top"><button className="back-link" onClick={() => navigate(null)}>← All lessons</button><span className="reader-position">LESSON {noteNumber(selected)} OF 30</span></div><div className="reader-heading"><span className="reader-kicker">BACKEND FROM FIRST PRINCIPLES</span><h1>{displayTitle(selected)}</h1><div className="reader-meta"><span><Icon name="clock" size={16}/> {readingMinutes(selected)} min read</span><span className="meta-divider"/><span>{selected.wordCount.toLocaleString()} words</span>{selected.created && <><span className="meta-divider"/><span>{selected.created}</span></>}</div><p>{selected.summary}</p><button className={`completion-button ${completed.includes(selected.id) ? 'completed' : ''}`} onClick={() => toggleCompleted(selected.id)}><span className="completion-check">{completed.includes(selected.id) && <Icon name="check" size={14}/>}</span>{completed.includes(selected.id) ? 'Completed' : 'Mark as complete'}</button></div><div className="article-divider"/><div className="markdown-body"><Markdown content={prepareMarkdown(selected.content, selected)} navigate={navigate}/></div><div className="reader-bottom"><span>Keep the momentum going</span><div>{selectedIndex > 0 && <button onClick={() => navigate(lessons[selectedIndex - 1].id)}>← Previous lesson</button>}{selectedIndex < lessons.length - 1 && <button className="next-button" onClick={() => navigate(lessons[selectedIndex + 1].id)}>Next lesson <Icon name="chevron" size={16}/></button>}</div></div></article><aside className="toc" aria-label="On this page"><span>ON THIS PAGE</span><div>{headings.map((heading, index) => <a key={`${heading.id}-${index}`} className={heading.level === 3 ? 'toc-sub' : ''} href={`#note/${selected.id}/${heading.id}`} onClick={event => { event.preventDefault(); navigate(selected.id, heading.id); }}>{heading.text}</a>)}</div></aside></div>}
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
