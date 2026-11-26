import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../team_musicscape_web/',import.meta.url));
const pagePath=path.join(root,'acc2026/press/index.html');
// The route must be a real page, not a redirect/iframe to the old provider.
assert.equal(await fs.access(pagePath).then(()=>true,()=>false),true,'The owned /acc2026/press/ route must exist');
const html=await fs.readFile(pagePath,'utf8');
assert.ok(html.includes('https://www.team-musicscape.kr/acc2026/press/'));
assert.ok(!/<iframe|http-equiv=["']refresh|__CF\$/i.test(html));
assert.ok(!/mailto:|tel:|sb_secret_|service_role/.test(html));
const sitemap=await fs.readFile(path.join(root,'sitemap.xml'),'utf8');
assert.equal(sitemap.split('<loc>https://www.team-musicscape.kr/acc2026/press/</loc>').length-1,1,'Deployed sitemap must contain canonical Press Room once');
for(const relative of ['acc2026/index.html','projects/2026-acc/archive/index.html']){
 const source=await fs.readFile(path.join(root,relative),'utf8');
 assert.ok(source.includes('/acc2026/press/'),`${relative} must link to the owned route`);
 assert.ok(!source.includes('muse-press-acc2026.teammusicscape.chatgpt.site'),`${relative} must not link to the old page`);
}
assert.ok(html.includes('/acc2026/#credits'));
assert.match(await fs.readFile(path.join(root,'acc2026/index.html'),'utf8'),/id="credits"/);
for(const file of ['2026-10-30-musicscape-press-release-v1.0.pdf','2026-10-30-musicscape-press-release-v1.0.docx']){
 assert.ok(html.includes(`https://muse-press-acc2026.teammusicscape.chatgpt.site/downloads/${file}`),'Preserve legacy public downloads');
}
assert.ok(html.includes('https://drive.google.com/file/d/116_9SMiNWLAFmWiadMfwXThqGGiRdP1r/view?usp=drive_link'));
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root))throw Error('outside root');
  if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.css':'text/css'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const {chromium}=await import(pathToFileURL(process.env.MUSE_NODE_MODULES+'/playwright/index.mjs').href);
const browser=await chromium.launch({headless:true,executablePath:process.env.MUSE_TEST_BROWSER});
try{
 const page=await browser.newPage();const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 const responseQueue=[];
 let articles=[{id:'cov-test',status:'published',press_room_slug:'acc2026',publisher:'테스트 매체',published_at:'2026-01-02',title:'공개된 테스트 기사',url:'https://example.org/article',author:'테스트 기자'}];
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  assert.equal(req.method(),'GET','Page must never send writes');
  if(url.hostname.endsWith('.supabase.co')){
   requests.push({url: url.toString(),method:req.method()});
   assert.equal(req.method(),'GET');assert.equal(url.pathname,'/rest/v1/media_coverage');
   assert.equal(url.searchParams.get('status'),'eq.published');
   assert.equal(url.searchParams.get('press_room_slug'),'eq.acc2026');
   assert.match(req.headers().apikey,/^sb_publishable_/);
   assert.equal(req.headers().authorization,undefined);
   assert.equal(req.headers().cookie,undefined);
   if(responseQueue.length){
    const entry=responseQueue.shift();entry.started();await entry.gate;
    return route.fulfill({json:entry.rows});
   }
   if(articles==='failure')return route.fulfill({status:503,body:'Unavailable'});
   return route.fulfill({json:articles});
  }
  if(url.origin!==origin)return route.abort();
  return route.continue();
 });
 const response=await page.goto(origin+'/acc2026/press/');assert.equal(response.status(),200);
 await page.getByRole('heading',{name:'공개된 테스트 기사'}).waitFor();
 assert.equal(await page.locator('#coverage-list .article-card').count(),1);
 assert.equal(await page.locator('#coverage-list a').getAttribute('href'),'https://example.org/article');
 assert.ok(await page.locator('.poster').evaluate(img=>img.complete&&img.naturalWidth>0));
 assert.equal(await page.locator('[id=coverage]').count(),1);
 assert.equal(requests.length,1);assert.deepEqual(errors,[]);
 console.log('PASS: real owned route, site entry points, public-only scoped GET, published article and poster');
 articles=[{...articles[0],url:'http://www.jndn.com/article.php?aid=123',title:'Approved HTTP article'}];
 await page.reload();
 await page.waitForFunction(()=>!document.querySelector('#coverage-list').textContent.includes('불러오는 중'));
 assert.equal(await page.locator('#coverage-list .article-title').textContent(),'Approved HTTP article','Approved exact www.jndn.com HTTP must render');
 console.log('PASS: approved exact-host HTTP article');
 const base={...articles[0],url:'https://example.org/article',title:'Allowed HTTPS'};
 const rejectedURLs=[
  'http://example.org/article','http://jndn.com/article','http://sub.www.jndn.com/article',
  'http://www.jndn.com.evil.test/article','http://www.jndn.com./article',
  'http://www.jndn.com@evil.test/article','http://user@www.jndn.com/article',
  'http://@www.jndn.com/article','http://www.jndn.com:8080/article','http://www.jndn.com:80/article',
  'https://user:pass@example.org/article','https://example.org:8443/article','https://example.org:443/article',
  'http://127.0.0.1/article','javascript:alert(1)','data:text/html,hello',
  'http://www%2ejndn.com/article','http://www.jndn.com\\\\@evil.test/article'
 ];
 articles=[base,...rejectedURLs.map((url,i)=>({...base,url:url+(url.includes('?')?'&':'?')+`case=${i}`,title:`Rejected ${i}`}))];
 await page.reload();
 await page.waitForFunction(()=>!document.querySelector('#coverage-list').textContent.includes('불러오는 중'));
 assert.deepEqual(await page.locator('#coverage-list .article-title').allTextContents(),['Allowed HTTPS'],'Unsafe protocols, lookalikes, userinfo and explicit ports must be rejected');
 console.log(`PASS: URL exception boundary (${rejectedURLs.length} rejected inputs)`);
 const settled=()=>page.waitForFunction(()=>!document.querySelector('#coverage-list').textContent.includes('불러오는 중'));
 const titles=()=>page.locator('#coverage-list .article-title').allTextContents();
 const hostile='<img src=x onerror="window.injected=true"><script>window.injected=true</script>';
 articles=[{...base,title:hostile},
  ...['draft','review','rejected','archived',null].map((status,i)=>({...base,status,url:`https://example.org/status/${i}`})),
  {...base,press_room_slug:'another-room',url:'https://example.org/other'},
  {...base,published_at:'2026-02-30',url:'https://example.org/bad-date'}];
 await page.reload();await settled();
 assert.deepEqual(await titles(),[hostile]);
 assert.equal(await page.locator('#coverage-list img, #coverage-list script').count(),0);
 assert.equal(await page.evaluate(()=>window.injected),undefined);
 assert.equal(await page.locator('#coverage-list a').getAttribute('rel'),'noopener noreferrer');
 console.log('PASS: only published acc2026 valid rows; malicious title is literal text');
 for(const [state,label] of [['failure','error'],[[],'empty'],[{},'invalid-response'],[[{...base,status:'review'}],'revoked-publication']]){
  articles=[base];await page.reload();await settled();assert.deepEqual(await titles(),['Allowed HTTPS']);
  articles=state;await page.reload();await settled();
  assert.deepEqual(await titles(),[],`${label} must not retain old articles`);
  assert.match(await page.locator('#coverage-list').textContent(),label==='empty'||label==='revoked-publication'?/현재 공개된/:/잠시 불러올 수 없습니다/);
  assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  console.log(`PASS: ${label} after reload has no stale fallback`);
 }
 articles=[base];
 for(const routePath of ['/acc2026/press','/acc2026/press/']){
  await page.goto(origin+routePath);await settled();assert.deepEqual(await titles(),['Allowed HTTPS']);
  assert.deepEqual(await page.locator('script[src]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('src'))),['/acc2026/press/press-room-config.js','/acc2026/press/press-room.js']);
  for(const size of [{width:1440,height:1000},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]){
   await page.setViewportSize(size);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${routePath} ${size.width}px must not overflow`);
   assert.ok(await page.locator('.poster').evaluate(img=>img.complete&&img.naturalWidth>0));
  }
  for(const id of ['resources','coverage']){
   assert.equal(await page.locator(`#${id}`).count(),1);
   await page.locator(`nav a[href="#${id}"]`).click();
   await page.waitForFunction(id=>location.hash==='#'+id,id);
  }
 }
 assert.deepEqual(errors,[]);assert.ok(requests.every(request=>request.method==='GET'));
 console.log('PASS: slash/non-slash absolute scripts, poster, anchors, 320/390/768/1024/1440px no overflow; no API writes');
 // Controlled overlapping bfcache refreshes: an old published read must not undo revocation.
 let releaseOld,oldStarted;
 const started=new Promise(resolve=>{oldStarted=resolve;});
 responseQueue.push({rows:[base],started:oldStarted,gate:new Promise(resolve=>{releaseOld=resolve;})});
 await page.evaluate(()=>{
  window.parsedResponses=0;const original=window.fetch;
  window.fetch=async(...args)=>{const response=await original(...args);const json=response.json.bind(response);response.json=async()=>{const rows=await json();window.parsedResponses++;return rows;};return response;};
  dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
 });
 await started;
 assert.deepEqual(await titles(),[],'Refresh must immediately clear previous published cards');
 articles=[];
 await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await page.waitForFunction(()=>window.parsedResponses===1);await settled();
 releaseOld();await page.waitForFunction(()=>window.parsedResponses===2);
 assert.deepEqual(await titles(),[],'Older published response must not overwrite latest revoked state');
 assert.match(await page.locator('#coverage-list').textContent(),/현재 공개된/);
 console.log('PASS: overlapping restored-tab reads cannot resurrect revoked publication');
 assert.deepEqual(errors,[]);assert.ok(requests.every(request=>request.method==='GET'));
 if(process.env.MUSE_TEST_ARTIFACTS){
  await fs.mkdir(process.env.MUSE_TEST_ARTIFACTS,{recursive:true});
  articles=[base];await page.goto(origin+'/acc2026/press/');await settled();
  for(const [name,size] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
   await page.setViewportSize(size);
   await page.screenshot({path:path.join(process.env.MUSE_TEST_ARTIFACTS,`press-room-${name}.png`),fullPage:true});
  }
  console.log('PASS: desktop/mobile screenshot artifacts saved (synthetic data)');
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
