import React from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);
const slugify = value => value.toLowerCase().replace(/&[a-z]+;/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
const textOf = node => node.type === 'text' ? node.value : (node.children || []).map(textOf).join('');

function renderNode(node, key, navigate) {
  if (node.type === 'text') return node.value;
  if (node.type !== 'element') return null;
  const tag = node.tagName;
  const props = { key };
  const source = node.properties || {};
  if (source.title) props.title = String(source.title);
  if (tag === 'h2' || tag === 'h3') props.id = slugify(textOf(node));
  if (tag === 'a') {
    const href = String(source.href || '');
    if (!/^(https?:\/\/|mailto:|#)/i.test(href)) return React.createElement('span', props, ...(node.children || []).map((child, index) => renderNode(child, index, navigate)));
    props.href = href;
    if (href.startsWith('#note/')) {
      props.onClick = event => {
        event.preventDefault();
        const match = href.match(/^#note\/([^/]+)(?:\/(.*))?$/);
        if (match) navigate(match[1], match[2] ? decodeURIComponent(match[2]) : '');
      };
    } else if (!href.startsWith('#')) { props.target = '_blank'; props.rel = 'noopener noreferrer'; }
  }
  if (tag === 'img') {
    const src = String(source.src || '');
    if (!/^https?:\/\//i.test(src)) return null;
    props.src = src;
    props.alt = String(source.alt || '');
  }
  if (tag === 'ol' && source.start) props.start = Number(source.start);
  if (tag === 'input') { props.type = 'checkbox'; props.checked = Boolean(source.checked); props.readOnly = true; }
  if (tag === 'th' || tag === 'td') { if (source.align) props.style = { textAlign: source.align }; }
  return React.createElement(tag, props, ...(node.children || []).map((child, index) => renderNode(child, index, navigate)));
}

export default function Markdown({ content, navigate }) {
  const tree = processor.runSync(processor.parse(content));
  return <>{tree.children.map((node, index) => renderNode(node, index, navigate))}</>;
}
