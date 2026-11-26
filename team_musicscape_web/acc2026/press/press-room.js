// Anonymous read only. No stored snapshots: revoked/unapproved articles must disappear on reload.
(() => {
  const list = document.querySelector('#coverage-list');
  if (!list) return;
  const fail = () => { list.textContent = '언론 보도 목록을 잠시 불러올 수 없습니다. 잠시 후 새로고침해 주세요.'; };
  const dateLabel = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value) return '';
    const [year,month,day] = value.split('-').map(Number);
    return `${year}. ${month}. ${day}.`;
  };
  const articleURL = value => {
    try {
      if (typeof value !== 'string' || /[\\\s]/.test(value)) return null;
      const authority = value.match(/^https?:\/\/([^/?#]+)/i)?.[1];
      if (!authority || /[@:%]/.test(authority)) return null;
      const url = new URL(value);
      const approvedHTTP = url.protocol === 'http:' && authority.toLowerCase() === 'www.jndn.com';
      return (url.protocol === 'https:' || approvedHTTP) && !url.username && !url.password && !url.port ? url.href : null;
    } catch { return null; }
  };
  let loadGeneration = 0;
  async function load() {
    const generation = ++loadGeneration;
    list.textContent = '승인된 보도를 불러오는 중입니다.';
    try {
      const source = window.MUSE_PRESS_ROOM;
      if (!source || source.press_room_slug !== 'acc2026' ||
          source.supabase_url !== 'https://iuyrohoivanhcvgmxgko.supabase.co' ||
          !/^sb_publishable_[A-Za-z0-9_-]+$/.test(source.publishable_key || '')) throw Error('Invalid public configuration');
      const endpoint = new URL('/rest/v1/media_coverage', source.supabase_url);
      endpoint.search = new URLSearchParams({
        select:'id,publisher,published_at,title,url,author,status,press_room_slug',
        press_room_slug:'eq.acc2026', status:'eq.published', order:'published_at.desc'
      }).toString();
      const response = await fetch(endpoint, {
        method:'GET', credentials:'omit', cache:'no-store',
        headers:{apikey:source.publishable_key}, signal:AbortSignal.timeout(12000)
      });
      if (!response.ok) throw Error('Public coverage unavailable');
      const articles = await response.json();
      if (generation !== loadGeneration) return;
      if (!Array.isArray(articles)) throw Error('Invalid coverage response');
      const content = document.createDocumentFragment();
      const seen = new Set();
      for (const article of articles) {
        if (!article || article.status !== 'published' || article.press_room_slug !== 'acc2026' ||
            typeof article.title !== 'string' || !article.title.trim() ||
            typeof article.publisher !== 'string' || !article.publisher.trim()) continue;
        const href = articleURL(article.url), date = dateLabel(article.published_at);
        if (!href || !date || seen.has(href)) continue;
        seen.add(href);
        const card = document.createElement('a');
        card.className = 'article-card'; card.href = href;
        card.target = '_blank'; card.rel = 'noopener noreferrer';
        const meta = document.createElement('div'); meta.className = 'article-meta';
        for (const value of [article.publisher,date,typeof article.author === 'string' && article.author.trim() ? `${article.author} 기자` : null].filter(Boolean)) {
          const item = document.createElement('span'); item.textContent = value; meta.append(item);
        }
        const title = document.createElement('h3'); title.className = 'article-title'; title.textContent = article.title;
        const link = document.createElement('span'); link.className = 'article-link'; link.textContent = '기사 원문 보기 ↗';
        card.append(meta,title,link); content.append(card);
      }
      list.replaceChildren(content);
      if (!seen.size) list.textContent = '현재 공개된 언론 보도가 없습니다.';
    } catch { if (generation === loadGeneration) fail(); }
  }
  load();
  // Refresh anonymous publication state when a tab is restored from the back-forward cache.
  window.addEventListener('pageshow', event => { if (event.persisted) load(); });
})();
