"use strict";

const DATA_BASE = "data";
const state = {
  entries: [],
  entriesById: new Map(),
  aliases: {},
  aliasesById: new Map(),
  linksBySource: new Map(),
  backlinksByTarget: new Map(),
  report: null,
  query: "",
  ready: false
};

const app = document.getElementById("app");

window.addEventListener("hashchange", () => {
  renderRoute().catch(renderFatal);
});

document.addEventListener("DOMContentLoaded", () => {
  init().catch(renderFatal);
});

async function init() {
  const [entries, aliases, links, report] = await Promise.all([
    fetchJson(`${DATA_BASE}/indexes/entries.json`),
    fetchJson(`${DATA_BASE}/indexes/aliases.json`),
    fetchJson(`${DATA_BASE}/indexes/links-candidates.json`),
    fetchJson(`${DATA_BASE}/source/extraction-report.json`).catch(() => null)
  ]);

  state.entries = entries.slice().sort((a, b) => Number(a.source_order) - Number(b.source_order));
  state.aliases = aliases;
  state.report = report;

  for (const entry of state.entries) {
    state.entriesById.set(entry.id, entry);
  }

  buildAliasSearch(aliases);
  buildLinkIndexes(links);
  state.ready = true;
  await renderRoute();
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url}: ${response.status}`);
  }
  return response.json();
}

function buildAliasSearch(aliases) {
  for (const [alias, ids] of Object.entries(aliases)) {
    for (const id of ids) {
      if (!state.aliasesById.has(id)) {
        state.aliasesById.set(id, []);
      }
      state.aliasesById.get(id).push(alias);
    }
  }

  for (const entry of state.entries) {
    const aliasText = (state.aliasesById.get(entry.id) || []).join(" ");
    entry.searchText = normalizeSearch(`${entry.id} ${entry.headword} ${entry.base_headword || ""} ${aliasText}`);
  }
}

function buildLinkIndexes(links) {
  for (const link of links) {
    if (!state.linksBySource.has(link.source_id)) {
      state.linksBySource.set(link.source_id, new Map());
    }
    state.linksBySource.get(link.source_id).set(Number(link.position), link);

    if (link.match_status === "matched" && link.matched_id && link.matched_id !== link.source_id) {
      if (!state.backlinksByTarget.has(link.matched_id)) {
        state.backlinksByTarget.set(link.matched_id, []);
      }
      state.backlinksByTarget.get(link.matched_id).push(link);
    }
  }
}

async function renderRoute() {
  if (!state.ready) return;

  const route = getRoute();
  if (route[0] === "entry" && route[1]) {
    await renderEntry(route[1]);
    return;
  }

  if (route[0] === "letter" && route[1]) {
    renderIndex(route[1].toUpperCase());
    return;
  }

  renderIndex(null);
}

function getRoute() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  return raw ? raw.split("/").map(decodeURIComponent) : [];
}

function renderShell(content, options = {}) {
  const title = options.title || "Dictionary of Pali Proper Names";
  const subtitle = options.subtitle || `${state.entries.length.toLocaleString()} entries from the preprocessed DPPN data.`;
  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div>
          <h1 class="site-title">${escapeHtml(title)}</h1>
          <p class="subtitle">${escapeHtml(subtitle)}</p>
        </div>
        <nav class="nav-actions" aria-label="Primary">
          <a href="#/">Index</a>
        </nav>
      </header>
      ${content}
    </main>
  `;
}

function renderIndex(activeLetter) {
  const letters = getLetters();
  const entries = filterEntries(activeLetter, state.query);
  const grouped = groupByLetter(entries);
  const shownCount = entries.length;

  const content = `
    <section class="search-panel">
      <div class="search-row">
        <input id="searchBox" class="search-box" type="search" value="${escapeAttr(state.query)}"
          placeholder="Search headword, alias, or entry ID" autocomplete="off">
        <span class="result-count">${shownCount.toLocaleString()} shown</span>
      </div>
      <nav class="letters" aria-label="Letters">
        <a class="letter-link ${activeLetter ? "" : "is-active"}" href="#/">All</a>
        ${letters.map((letter) => {
          const count = state.report?.entries_per_letter?.[letter] || state.entries.filter((entry) => entry.letter === letter).length;
          return `<a class="letter-link ${letter === activeLetter ? "is-active" : ""}" href="#/letter/${encodeURIComponent(letter)}">${escapeHtml(letter)} <span class="meta">${count}</span></a>`;
        }).join("")}
      </nav>
      ${renderSummary()}
    </section>
    <section class="entry-groups" aria-label="Entries">
      ${renderEntryGroups(grouped, shownCount)}
    </section>
  `;

  renderShell(content);
  const searchBox = document.getElementById("searchBox");
  searchBox?.focus({ preventScroll: true });
  searchBox?.setSelectionRange(searchBox.value.length, searchBox.value.length);
  searchBox?.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderIndex(activeLetter);
  });
}

function renderSummary() {
  const total = state.report?.total_entries || state.entries.length;
  const redirects = state.entries.filter((entry) => entry.status === "redirect").length;
  const sourceFiles = state.report?.html_files_processed || "n/a";
  const dictionaryFiles = state.report?.dictionary_html_files || "n/a";
  return `
    <div class="summary-grid" aria-label="Source summary">
      <div class="summary-item"><span class="summary-label">Entries</span><span class="summary-value">${Number(total).toLocaleString()}</span></div>
      <div class="summary-item"><span class="summary-label">Redirects</span><span class="summary-value">${redirects.toLocaleString()}</span></div>
      <div class="summary-item"><span class="summary-label">HTML files</span><span class="summary-value">${escapeHtml(String(sourceFiles))}</span></div>
      <div class="summary-item"><span class="summary-label">Dictionary files</span><span class="summary-value">${escapeHtml(String(dictionaryFiles))}</span></div>
    </div>
  `;
}

function renderEntryGroups(grouped, shownCount) {
  if (!shownCount) {
    return `<p class="empty">No entries match this search.</p>`;
  }

  return getLetters().filter((letter) => grouped.has(letter)).map((letter) => {
    const entries = grouped.get(letter);
    return `
    <section class="letter-group">
      <h2 class="letter-heading">${escapeHtml(letter)} <span class="meta">${entries.length.toLocaleString()}</span></h2>
      <ul class="entry-list">
        ${entries.map((entry) => `
          <li><a href="#/entry/${encodeURIComponent(entry.id)}">${escapeHtml(entry.headword)}</a>${entry.status === "redirect" ? ` <span class="badge redirect">redirect</span>` : ""}</li>
        `).join("")}
      </ul>
    </section>
  `;
  }).join("");
}

function filterEntries(activeLetter, query) {
  const normalizedQuery = normalizeSearch(query);
  return state.entries.filter((entry) => {
    if (activeLetter && entry.letter !== activeLetter) return false;
    if (!normalizedQuery) return true;
    return entry.searchText.includes(normalizedQuery);
  });
}

function groupByLetter(entries) {
  const grouped = new Map();
  for (const entry of entries) {
    const letter = entry.letter || "#";
    if (!grouped.has(letter)) grouped.set(letter, []);
    grouped.get(letter).push(entry);
  }
  return grouped;
}

function getLetters() {
  const preferred = ["A", "B", "C", "D", "E", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "T", "U", "V", "Y"];
  const letters = new Set(state.entries.map((entry) => entry.letter || "#"));
  const ordered = preferred.filter((letter) => letters.has(letter));
  const remaining = [...letters].filter((letter) => !preferred.includes(letter)).sort((a, b) => a.localeCompare(b, "en"));
  return [...ordered, ...remaining];
}

async function renderEntry(id) {
  const entry = state.entriesById.get(id);
  if (!entry) {
    renderShell(`<p class="error">Entry not found: ${escapeHtml(id)}</p>`, { title: "Entry not found" });
    return;
  }

  if (entry.status === "redirect" && entry.redirect_to && state.entriesById.has(entry.redirect_to)) {
    renderRedirect(entry, state.entriesById.get(entry.redirect_to));
    return;
  }

  const markdown = await fetchText(dataUrl(entry.path));
  const parsed = parseEntryMarkdown(markdown);
  const source = parsed.sections["English source"] || "";
  const html = renderMarkdown(source, entry.id);
  const links = getRelatedLinks(entry.id);
  const ambiguous = getAmbiguousLinks(entry.id);
  const backlinks = getBacklinks(entry.id);
  const pager = getPager(entry);

  const content = `
    ${entry.status === "redirect" ? renderUnresolvedRedirectNotice(entry) : ""}
    <article class="entry-layout">
      <div class="entry-main">
        <div class="entry-meta">
          <span class="badge ${entry.status === "redirect" ? "redirect" : ""}">${escapeHtml(entry.status || "untranslated")}</span>
          <span class="meta">ID: ${escapeHtml(entry.id)}</span>
        </div>
        <h2 class="entry-title">${escapeHtml(entry.headword)}</h2>
        <section class="source-text">
          ${html || `<p class="empty">No English source content found.</p>`}
        </section>
        ${renderPager(pager)}
      </div>
      <aside class="side-panel" aria-label="Entry details">
        ${renderSourceBox(entry, parsed.frontMatter)}
        ${renderLinkBox("Matched related links", links)}
        ${renderAmbiguousBox(ambiguous)}
        ${renderLinkBox("Backlinks", backlinks)}
      </aside>
    </article>
  `;

  renderShell(content, {
    title: "Dictionary of Pali Proper Names",
    subtitle: `Entry: ${entry.headword}`
  });
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url}: ${response.status}`);
  }
  return response.text();
}

function dataUrl(path) {
  return `${DATA_BASE}/${path.replace(/\\/g, "/").replace(/^data\//, "")}`;
}

function parseEntryMarkdown(markdown) {
  const frontMatter = {};
  let body = markdown;
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (match) {
    Object.assign(frontMatter, parseYamlLite(match[1]));
    body = markdown.slice(match[0].length);
  }

  const sections = {};
  const sectionRegex = /^##\s+(.+?)\s*$/gm;
  const matches = [...body.matchAll(sectionRegex)];
  for (let i = 0; i < matches.length; i += 1) {
    const name = matches[i][1].trim();
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    sections[name] = body.slice(start, end).trim();
  }

  return { frontMatter, body, sections };
}

function parseYamlLite(yaml) {
  const result = {};
  const lines = yaml.split(/\r?\n/);
  let currentListKey = null;
  let currentObjectKey = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const listMatch = line.match(/^\s{2}-\s+(.*)$/);
    if (listMatch && currentListKey) {
      result[currentListKey].push(unquoteYaml(listMatch[1]));
      continue;
    }

    const nestedMatch = line.match(/^\s{2}([A-Za-z0-9_]+):\s*(.*)$/);
    if (nestedMatch && currentObjectKey) {
      result[currentObjectKey][nestedMatch[1]] = unquoteYaml(nestedMatch[2]);
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!keyMatch) continue;

    const [, key, rawValue] = keyMatch;
    currentListKey = null;
    currentObjectKey = null;

    if (rawValue === "") {
      const nextLooksNested = lines.some((candidate) => candidate.startsWith("  ") && !candidate.startsWith("  - "));
      result[key] = nextLooksNested ? {} : null;
      currentObjectKey = nextLooksNested ? key : null;
    } else if (rawValue === "[]") {
      result[key] = [];
      currentListKey = key;
    } else {
      result[key] = unquoteYaml(rawValue);
      if (Array.isArray(result[key])) currentListKey = key;
    }

    if (key === "aliases" || key === "link_candidates") {
      result[key] = [];
      currentListKey = key;
      currentObjectKey = null;
    }
    if (key === "source") {
      result[key] = {};
      currentObjectKey = key;
    }
  }

  return result;
}

function unquoteYaml(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === "null") return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const quoted = trimmed.match(/^"(.*)"$/);
  return quoted ? quoted[1].replace(/\\"/g, "\"") : trimmed;
}

function renderMarkdown(markdown, entryId) {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  return normalized.split(/\n{2,}/).map((block) => {
    const trimmed = block.trim();
    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) return `<h2>${renderInline(h2[1], entryId)}</h2>`;
    const h1 = trimmed.match(/^#\s+(.+)$/);
    if (h1) return `<h1>${renderInline(h1[1], entryId)}</h1>`;
    return `<p>${renderInline(trimmed, entryId).replace(/\n/g, "<br>")}</p>`;
  }).join("");
}

function renderInline(text, entryId) {
  const markerRegex = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi;
  let output = "";
  let lastIndex = 0;
  let match;

  while ((match = markerRegex.exec(text)) !== null) {
    output += renderPlainInline(text.slice(lastIndex, match.index));
    output += renderTermMarker(match[1], match[2], entryId);
    lastIndex = markerRegex.lastIndex;
  }

  output += renderPlainInline(text.slice(lastIndex));
  return output;
}

function renderPlainInline(text) {
  return escapeHtml(text).replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
}

function renderTermMarker(attrs, inner, entryId) {
  const attrMap = parseAttributes(attrs);
  const position = Number(attrMap["data-dppn-term-pos"]);
  const termClass = attrMap["data-dppn-term-class"] || "";
  const link = state.linksBySource.get(entryId)?.get(position);
  const label = escapeHtml(stripTags(inner));
  const classNames = ["dppn-term"];
  if (termClass === "t18") classNames.push("dppn-term-t18");
  if (termClass === "t14") classNames.push("dppn-term-t14");

  if (link?.match_status === "matched" && link.matched_id && link.matched_id !== entryId && state.entriesById.has(link.matched_id)) {
    const target = state.entriesById.get(link.matched_id);
    const title = `${target.headword} (${link.matched_id})`;
    return `<a class="term-link ${classNames.join(" ")}" href="#/entry/${encodeURIComponent(link.matched_id)}" title="${escapeAttr(title)}">${label}</a>`;
  }

  if (link?.match_status === "ambiguous") classNames.push("term-ambiguous");
  if (link?.match_status === "unmatched") classNames.push("term-unmatched");
  const title = link ? `${link.match_status}: ${link.candidate_text}` : "unmatched marker";
  return `<span class="${classNames.join(" ")}" title="${escapeAttr(title)}">${label}</span>`;
}

function parseAttributes(attrs) {
  const map = {};
  const attrRegex = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = attrRegex.exec(attrs)) !== null) {
    map[match[1]] = match[3] ?? match[4] ?? "";
  }
  return map;
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, "");
}

function getRelatedLinks(entryId) {
  const links = [...(state.linksBySource.get(entryId)?.values() || [])]
    .filter((link) => link.match_status === "matched" && link.matched_id && link.matched_id !== entryId && state.entriesById.has(link.matched_id));
  return uniqueEntries(links.map((link) => state.entriesById.get(link.matched_id)));
}

function getAmbiguousLinks(entryId) {
  return [...(state.linksBySource.get(entryId)?.values() || [])]
    .filter((link) => link.match_status === "ambiguous");
}

function getBacklinks(entryId) {
  const links = state.backlinksByTarget.get(entryId) || [];
  return uniqueEntries(links.map((link) => state.entriesById.get(link.source_id)).filter(Boolean));
}

function uniqueEntries(entries) {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    result.push(entry);
  }
  return result.slice(0, 40);
}

function renderSourceBox(entry, frontMatter) {
  const source = frontMatter.source || {};
  const epubFile = entry.source_file || source.epub_file || "";
  const sourceOrder = entry.source_order || source.source_order || "";
  const section = entry.section || frontMatter.section || "";
  return `
    <section class="info-box">
      <h2>Source metadata</h2>
      <dl class="key-values">
        <dt>EPUB file</dt><dd>${escapeHtml(String(epubFile || "n/a"))}</dd>
        <dt>Source order</dt><dd>${escapeHtml(String(sourceOrder || "n/a"))}</dd>
        <dt>Section</dt><dd>${escapeHtml(String(section || "n/a"))}</dd>
      </dl>
    </section>
  `;
}

function renderLinkBox(title, entries) {
  return `
    <section class="info-box">
      <h2>${escapeHtml(title)}</h2>
      ${entries.length ? `
        <ul class="compact-list">
          ${entries.map((entry) => `<li><a href="#/entry/${encodeURIComponent(entry.id)}">${escapeHtml(entry.headword)}</a></li>`).join("")}
        </ul>
      ` : `<p class="empty">None found.</p>`}
    </section>
  `;
}

function renderAmbiguousBox(links) {
  return `
    <section class="info-box">
      <h2>Ambiguous references</h2>
      ${links.length ? `
        <ul class="compact-list">
          ${links.slice(0, 40).map((link) => `
            <li>${escapeHtml(link.candidate_text)} <span class="meta">(${(link.matched_ids || []).map(escapeHtml).join(", ") || "no target"})</span></li>
          `).join("")}
        </ul>
      ` : `<p class="empty">None found.</p>`}
    </section>
  `;
}

function renderPager(pager) {
  return `
    <nav class="pager" aria-label="Entry navigation">
      ${pager.previous ? `<a href="#/entry/${encodeURIComponent(pager.previous.id)}">Previous: ${escapeHtml(pager.previous.headword)}</a>` : ""}
      ${pager.next ? `<a href="#/entry/${encodeURIComponent(pager.next.id)}">Next: ${escapeHtml(pager.next.headword)}</a>` : ""}
      <a href="#/">Back to index</a>
    </nav>
  `;
}

function getPager(entry) {
  const index = state.entries.findIndex((candidate) => candidate.id === entry.id);
  return {
    previous: index > 0 ? state.entries[index - 1] : null,
    next: index >= 0 && index + 1 < state.entries.length ? state.entries[index + 1] : null
  };
}

function renderRedirect(entry, target) {
  const content = `
    <div class="redirect-box">
      <p><strong>${escapeHtml(entry.headword)}</strong> is a redirect.</p>
      <p>Target: <a href="#/entry/${encodeURIComponent(target.id)}">${escapeHtml(target.headword)}</a></p>
    </div>
    ${renderPager(getPager(entry))}
  `;
  renderShell(content, {
    title: "Dictionary of Pali Proper Names",
    subtitle: `Redirect entry: ${entry.headword}`
  });
}

function renderUnresolvedRedirectNotice(entry) {
  return `
    <div class="redirect-box">
      <p><strong>Unresolved redirect.</strong> This entry is marked as a redirect, but its target is not resolved.</p>
      <p class="meta">redirect_to: ${escapeHtml(String(entry.redirect_to || "null"))}</p>
    </div>
  `;
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function renderFatal(error) {
  console.error(error);
  app.innerHTML = `
    <main class="shell">
      <h1 class="site-title">Dictionary of Pali Proper Names</h1>
      <p class="error">${escapeHtml(error.message || String(error))}</p>
    </main>
  `;
}
