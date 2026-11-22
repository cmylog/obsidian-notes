import React, { useEffect, useMemo, useRef, useState } from 'react';
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
const chapters = [
  { name: 'Getting started', range: [1, 5], description: 'The core ideas and the web itself.' },
  { name: 'Building APIs', range: [6, 11], description: 'Requests, structure, identity, and contracts.' },
  { name: 'Data & reliability', range: [12, 16], description: 'Persistence, caching, queues, and failure.' },
  { name: 'Running systems', range: [17, 20], description: 'Configuration, observability, and security.' },
  { name: 'At scale', range: [21, 25], description: 'Performance, concurrency, and storage.' },
  { name: 'Engineering practice', range: [26, 30], description: 'Testing, operations, and delivery.' },
];
const chapterNotes = chapter => lessons.filter(note => { const n = parseInt(note.title, 10); return n >= chapter.range[0] && n <= chapter.range[1]; });
const numberOf = note => note.title.match(/^\d+(?:\.\d+)?/)?.[0] || '';
const titleOf = note => note.title.replace(/^\d+(?:\.\d+)?\s*/, '');
const readingTime = note => Math.max(1, Math.ceil(note.wordCount / 220));
const slugify = value => value.toLowerCase().replace(/&[a-z]+;/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

function currentLocation() {
  const match = location.hash.match(/^#note\/([^/]+)(?:\/(.*))?$/);
  return { id: match?.[1] && byId.has(match[1]) ? match[1] : null, section: match?.[2] ? decodeURIComponent(match[2]) : null };
}
function resolveWiki(path) {
  const trimmed = path.replace(/\.md$/i, '').replace(/^Notes\/Backend from First Principles\//i, '').replace(/^Backend from First Principles\//i, '');
  return byPath.get(trimmed.toLowerCase()) || byTitle.get(trimmed.split('/').at(-1).toLowerCase());
}
function prepareMarkdown(content, note) {
  return content
    .replace(/^# .+\n+/, '')
    .replace(/^> \[!(\w+)\](.*)$/gm, (_, kind, rest) => `> **${kind[0].toUpperCase() + kind.slice(1)}${rest ? ` · ${rest.trim()}` : ''}**`)
    .replace(/!?\[\[([^\]]+)\]\]/g, (_, inner) => {
      const [target, label] = inner.split('|');
      const [targetPath, section] = target.split('#');
      const linked = targetPath ? resolveWiki(targetPath) : note;
      const text = (label || section || targetPath.split('/').at(-1)).replace(/[\[\]]/g, '');
      if (!linked) return text;
      return `[${text}](#note/${linked.id}${section ? `/${encodeURIComponent(slugify(section))}` : ''})`;
    });
}
function getHeadings(content) {
  const withoutCode = content.replace(/```[\s\S]*?```/g, '');
  return [...withoutCode.matchAll(/^##\s+(.+)$/gm)]
    .map(([, text]) => ({ text: text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/[*_`]/g, ''), id: slugify(text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/[*_`]/g, '')) }))
    .filter(heading => heading.text.toLowerCase() !== 'contents');
}
function resultExcerpt(note, query) {
  const clean = note.content.replace(/^# .+\n+/, '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/[#*`>|]/g, '').replace(/\s+/g, ' ').trim();
  const index = clean.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return note.summary;
  const start = Math.max(0, index - 45);
  return `${start ? '…' : ''}${clean.slice(start, start + 145)}${start + 145 < clean.length ? '…' : ''}`;
}
function Icon({ name, size = 18 }) {
  const paths = {
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    close: <path d="M5 5l14 14M19 5 5 19"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function App() {
  const [route, setRoute] = useState(currentLocation);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [completed, setCompleted] = useState(() => { try { return JSON.parse(localStorage.getItem('bfp-completed') || '[]'); } catch { return []; } });
  const searchRef = useRef(null);
  const scrollRef = useRef(null);
  const selected = route.id ? byId.get(route.id) : null;
  const selectedIndex = selected ? lessons.findIndex(note => note.id === selected.id) : -1;
  const next = selectedIndex >= 0 ? lessons[selectedIndex + 1] : null;
  const previous = selectedIndex > 0 ? lessons[selectedIndex - 1] : null;
  const continueWith = lessons.find(note => !completed.includes(note.id)) || lessons[0];
  const shortcutLabel = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
  const headings = useMemo(() => selected ? getHeadings(selected.content) : [], [selected]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return lessons.filter(note => `${note.title} ${note.tags.join(' ')} ${note.content}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.title.toLowerCase().includes(q)) - Number(a.title.toLowerCase().includes(q)));
  }, [query]);

  useEffect(() => { const onHash = () => setRoute(currentLocation()); window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash); }, []);
  useEffect(() => {
    setSidebarOpen(false);
    setSearchOpen(false);
    if (route.section) requestAnimationFrame(() => document.getElementById(route.section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    else scrollRef.current?.scrollTo({ top: 0 });
  }, [route]);
  useEffect(() => { localStorage.setItem('bfp-completed', JSON.stringify(completed)); }, [completed]);
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScroll = () => {
      const distance = container.scrollHeight - container.clientHeight;
      setScrollProgress(distance > 0 ? Math.min(100, Math.round(container.scrollTop / distance * 100)) : 0);
    };
    onScroll(); container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [selected]);
  useEffect(() => {
    const onKey = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); }
      if (event.key === 'Escape') { setSearchOpen(false); setSidebarOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  const navigate = (id, section = '') => {
    const hash = id ? `#note/${id}${section ? `/${encodeURIComponent(section)}` : ''}` : '#';
    if (location.hash === hash) { setRoute({ id, section }); if (!section) scrollRef.current?.scrollTo({ top: 0 }); }
    else location.hash = hash;
    setSearchOpen(false);
    setSidebarOpen(false);
  };
  const toggleCompleted = id => setCompleted(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const selectedChapter = chapters.find(chapter => selected && chapterNotes(chapter).some(note => note.id === selected.id));

  return <div className="app-shell">
    <div className={`mobile-scrim ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Course navigation">
      <div className="sidebar-brand"><button className="brand-button" onClick={() => navigate(null)}><span className="brand-symbol">[ ]</span><span>Backend Notes<small>FROM FIRST PRINCIPLES</small></span></button><button className="mobile-close icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><Icon name="close"/></button></div>
      <div className="sidebar-scroll"><div className="nav-caption">START HERE</div><button className={`overview-nav ${!selected ? 'active' : ''}`} onClick={() => navigate(null)}><Icon name="book" size={17}/> Overview</button>
        <div className="nav-caption course-caption">COURSE CONTENT <span>{lessons.length} lessons</span></div>
        {chapters.map(chapter => <div className="nav-group" key={chapter.name}><div className="nav-group-title">{chapter.name}</div>{chapterNotes(chapter).map(note => <button key={note.id} className={`nav-lesson ${selected?.id === note.id ? 'active' : ''}`} onClick={() => navigate(note.id)} title={note.title}><span className="nav-number">{numberOf(note)}</span><span>{titleOf(note)}</span>{completed.includes(note.id) && <span className="nav-done"><Icon name="check" size={13}/></span>}</button>)}</div>)}
      </div>
      <div className="sidebar-progress"><div><span>COURSE PROGRESS</span><strong>{completed.length}/{lessons.length}</strong></div><div className="progress-bar"><span style={{ width: `${completed.length / lessons.length * 100}%` }}/></div></div>
    </aside>

    <main className="main-area" ref={scrollRef}>
      {selected && <div className="reading-progress" style={{ width: `${scrollProgress}%` }} />}
      <header className="topbar"><div className="topbar-location"><button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Icon name="menu"/></button><button className="topbar-home" onClick={() => navigate(null)}>Notes</button><Icon name="chevron" size={14}/><span>{selected ? titleOf(selected) : 'Overview'}</span></div><button className="top-search" onClick={() => setSearchOpen(true)}><Icon name="search" size={17}/><span>Search notes...</span><kbd>{shortcutLabel}</kbd></button></header>

      {!selected ? <div className="overview-page"><div className="intro"><span className="eyebrow">YOUR STUDY LIBRARY</span><h1>Backend from<br/><span>First Principles</span></h1><p>{overview.summary}</p><div className="intro-actions"><button className="primary-button" onClick={() => navigate(continueWith.id)}>{completed.length ? 'Continue reading' : 'Start reading'} <Icon name="chevron" size={17}/></button><span>{completed.length} of {lessons.length} lessons completed</span></div></div><div className="overview-stats"><div><strong>{lessons.length}</strong><span>Lessons</span></div><div><strong>{chapters.length}</strong><span>Chapters</span></div><div><strong>{Math.round(lessons.reduce((sum, note) => sum + readingTime(note), 0) / 60)}h</strong><span>Reading time</span></div></div><div className="overview-heading"><div><span className="eyebrow">THE LEARNING PATH</span><h2>Explore the course</h2></div><p>Work through the lessons in order, or choose a topic.</p></div><div className="chapter-list">{chapters.map((chapter, index) => <section className="chapter" id={`chapter-${index + 1}`} key={chapter.name}><div className="chapter-heading"><div><span>CHAPTER {String(index + 1).padStart(2, '0')}</span><h3>{chapter.name}</h3><p>{chapter.description}</p></div><span>{chapterNotes(chapter).length} lessons</span></div><div className="chapter-lessons">{chapterNotes(chapter).map(note => <button key={note.id} className="chapter-row" onClick={() => navigate(note.id)}><span className="row-number">{numberOf(note)}</span><span className="row-title">{titleOf(note)}</span><span className="row-time">{readingTime(note)} min</span>{completed.includes(note.id) ? <span className="row-complete"><Icon name="check" size={16}/></span> : <Icon name="chevron" size={16}/>}</button>)}</div></section>)}</div><div className="overview-source"><span>ABOUT THIS COLLECTION</span><p>{overview.summary}</p><div className="markdown-body"><Markdown content={overview.content.split('## Source')[1] ? `## Source${overview.content.split('## Source')[1]}` : ''} navigate={navigate}/></div></div></div> :
        <div className="reader-layout"><article className="reader"><div className="reader-breadcrumb"><button onClick={() => navigate(null)}>All lessons</button><Icon name="chevron" size={14}/><span>{selectedChapter?.name}</span></div><div className="reader-heading"><span className="eyebrow">LESSON {numberOf(selected)} · {selectedChapter?.name.toUpperCase()}</span><h1>{titleOf(selected)}</h1><p className="reader-summary">{selected.summary}</p><div className="reader-meta"><span><Icon name="clock" size={15}/> {readingTime(selected)} min read</span><span>{selected.wordCount.toLocaleString()} words</span>{selected.created && <span>Updated {selected.created}</span>}</div></div><div className="article-rule"/><div className="markdown-body"><Markdown content={prepareMarkdown(selected.content, selected)} navigate={navigate}/></div><div className="lesson-finish"><div><span>FINISHED THIS LESSON?</span><h2>Keep your progress.</h2><p>Mark this lesson complete and pick up from here next time.</p></div><button className={`complete-button ${completed.includes(selected.id) ? 'is-complete' : ''}`} onClick={() => toggleCompleted(selected.id)}><Icon name="check" size={17}/>{completed.includes(selected.id) ? 'Completed' : 'Mark complete'}</button></div><div className="lesson-pagination">{previous ? <button onClick={() => navigate(previous.id)}><small>PREVIOUS LESSON</small><span>← {titleOf(previous)}</span></button> : <div/>}{next ? <button onClick={() => navigate(next.id)}><small>NEXT LESSON</small><span>{titleOf(next)} →</span></button> : <div/>}</div></article></div>}
    </main>

    <aside className="right-rail" aria-label="Reading tools">
      <button className="rail-search" onClick={() => setSearchOpen(true)}><Icon name="search" size={18}/><span>Search notes</span><kbd>{shortcutLabel}</kbd></button>
      {selected ? <section className="rail-panel rail-contents"><h2>On this page</h2><div className="rail-links">{headings.map((heading, index) => <a key={`${heading.id}-${index}`} href={`#note/${selected.id}/${heading.id}`} onClick={event => { event.preventDefault(); navigate(selected.id, heading.id); }}>{heading.text}</a>)}</div></section> : <section className="rail-panel"><h2>Explore chapters</h2><div className="rail-chapters">{chapters.map((chapter, index) => <button key={chapter.name} onClick={() => document.getElementById(`chapter-${index + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><span>{String(index + 1).padStart(2, '0')}</span>{chapter.name}<Icon name="chevron" size={15}/></button>)}</div></section>}
      <section className="rail-panel rail-learning"><div className="rail-learning-label">Your progress</div><strong>{Math.round(completed.length / lessons.length * 100)}%</strong><div className="progress-bar"><span style={{ width: `${completed.length / lessons.length * 100}%` }}/></div><p>{completed.length} of {lessons.length} lessons completed</p><button onClick={() => navigate(continueWith.id)}>{completed.length ? 'Continue reading' : 'Start reading'}<Icon name="chevron" size={16}/></button></section>
      <p className="rail-footer">Backend from First Principles<br/>A personal study library</p>
    </aside>

    {searchOpen && <div className="search-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setSearchOpen(false); }}><div className="search-dialog" role="dialog" aria-modal="true" aria-label="Search notes"><div className="dialog-search"><Icon name="search" size={20}/><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && results[0]) { navigate(results[0].id); setQuery(''); } }} placeholder="Search all lessons..." aria-label="Search all lessons"/><button onClick={() => { setQuery(''); setSearchOpen(false); }} aria-label="Close search"><Icon name="close" size={18}/></button></div><div className="search-results">{!query.trim() ? <div className="search-help"><Icon name="list" size={25}/><strong>Find a lesson or concept</strong><span>Search titles, tags, and the full text of every note.</span></div> : results.length ? <><div className="results-count">{results.length} {results.length === 1 ? 'result' : 'results'} for “{query}”</div>{results.map(note => <button key={note.id} className="search-result" onClick={() => { navigate(note.id); setQuery(''); }}><span>{numberOf(note)}</span><div><strong>{titleOf(note)}</strong><p>{resultExcerpt(note, query)}</p></div><Icon name="chevron" size={17}/></button>)}</> : <div className="search-help"><Icon name="search" size={25}/><strong>No results found</strong><span>Try a different word or phrase.</span></div>}</div><div className="search-hint">Press Esc to close · Enter opens the first result</div></div></div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
