(() => {
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  // Cookie sentinel: clearing cookies/site data resets the whole local OS on next launch.
  const cookieName = 'govenco_session';
  const hasCookie = document.cookie.split(';').some(x => x.trim().startsWith(cookieName + '='));
  if (!hasCookie) {
    try {
      Object.keys(localStorage).filter(k => k.startsWith('govenco.')).forEach(k => localStorage.removeItem(k));
    } catch {}
    document.cookie = `${cookieName}=1; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
  }

  const store = {
    get(k, f){ try { const v = localStorage.getItem('govenco.'+k); return v===null?f:JSON.parse(v);} catch{return f;} },
    set(k,v){ try { localStorage.setItem('govenco.'+k, JSON.stringify(v)); return true; } catch { return false; } }
  };

  const defaults = {
    name:'Guest', accent:'#ff3158', accent2:'#8c52ff', theme:'midnight', wallpaper:'aurora', radius:18,
    blur:28, fontScale:1, iconScale:1, taskbar:'floating', compact:false, square:false, animations:true,
    widgets:true, clock24:true, brightness:100, wallpaperBlur:0, desktopIcons:true, reduceTransparency:false, taskbarLabels:false
  };
  const state = { settings:{...defaults,...store.get('settings',{})}, windows:new Map(), z:100, active:null, history:[], hIndex:0,
    files:store.get('files', [
      {name:'Welcome.txt',type:'text',content:'Welcome to GovencoOS.\n\nEverything here runs locally in your browser.'},
      {name:'Ideas.txt',type:'text',content:'• Customize the desktop\n• Try the terminal\n• Create your own files'},
      {name:'Projects',type:'folder'}, {name:'Images',type:'folder'}
    ])
  };

  const wallpapers = {
    aurora:'radial-gradient(circle at 18% 18%,#3b1534 0,transparent 32%),radial-gradient(circle at 82% 22%,#172f59 0,transparent 34%),linear-gradient(145deg,#080a12,#111425 55%,#080a12)',
    ember:'radial-gradient(circle at 24% 18%,#652010 0,transparent 32%),radial-gradient(circle at 78% 70%,#47121f 0,transparent 35%),linear-gradient(145deg,#100909,#241011,#08090d)',
    ocean:'radial-gradient(circle at 18% 20%,#0b4c66 0,transparent 30%),radial-gradient(circle at 75% 25%,#16395f 0,transparent 36%),linear-gradient(145deg,#061017,#0b2131 55%,#061018)',
    violet:'radial-gradient(circle at 50% 10%,#552072 0,transparent 35%),radial-gradient(circle at 75% 72%,#182f67 0,transparent 38%),linear-gradient(145deg,#0b0712,#1a1028,#080913)',
    graphite:'linear-gradient(140deg,#12151b,#232834 50%,#0c0f14)',
    sunrise:'radial-gradient(circle at 15% 15%,#ff7a6f 0,transparent 30%),radial-gradient(circle at 80% 25%,#ffca7a 0,transparent 36%),linear-gradient(145deg,#4e275d,#cc6b63 55%,#2a2249)'
  };
  const themes = {
    midnight:{accent:'#ff3158',accent2:'#8c52ff',light:false}, neon:{accent:'#00e5ff',accent2:'#7cff6b',light:false},
    royal:{accent:'#7b61ff',accent2:'#d257ff',light:false}, ember:{accent:'#ff5c35',accent2:'#ffbd3f',light:false},
    ice:{accent:'#3a84ff',accent2:'#45d7ff',light:true}, mono:{accent:'#444a56',accent2:'#7a8190',light:true}
  };

  const apps = [
    {id:'files',name:'Files',icon:'▣',desktop:true,w:820,h:520,render:renderFiles},
    {id:'notepad',name:'Notepad',icon:'✎',desktop:true,w:740,h:520,render:renderNotepad},
    {id:'terminal',name:'Terminal',icon:'>_',desktop:true,w:760,h:500,render:renderTerminal},
    {id:'calculator',name:'Calculator',icon:'±',desktop:false,w:390,h:570,render:renderCalculator},
    {id:'monitor',name:'System Monitor',icon:'⌁',desktop:false,w:720,h:470,render:renderMonitor},
    {id:'paint',name:'Paint',icon:'✦',desktop:true,w:820,h:560,render:renderPaint},
    {id:'clockapp',name:'Clock',icon:'◷',desktop:false,w:520,h:420,render:renderClock},
    {id:'settings',name:'Settings',icon:'⚙',desktop:true,w:860,h:560,render:renderSettings},
    {id:'about',name:'About GovencoOS',icon:'G',desktop:false,w:520,h:390,render:renderAbout}
  ];

  function boot(){
    applySettings(); buildLaunchers(); buildWidgets(); bindShell(); updateClock(); setInterval(updateClock,1000);
    setTimeout(()=>{ $('#boot').classList.add('is-hidden'); $('#os').classList.remove('is-hidden'); toast('GovencoOS','System is ready'); },1300);
  }

  function applySettings(){
    const s=state.settings, root=document.documentElement;
    root.style.setProperty('--accent',s.accent); root.style.setProperty('--accent2',s.accent2);
    root.style.setProperty('--radius',s.radius+'px'); root.style.setProperty('--blur',s.blur+'px');
    root.style.setProperty('--font-scale',s.fontScale); root.style.setProperty('--icon-scale',s.iconScale);
    root.style.setProperty('--wallpaper',wallpapers[s.wallpaper]||wallpapers.aurora);
    root.style.setProperty('--brightness',String(s.brightness/100)); root.style.setProperty('--wallpaper-blur',s.wallpaperBlur+'px');
    document.body.classList.toggle('light',!!themes[s.theme]?.light);
    document.body.classList.toggle('compact',!!s.compact); document.body.classList.toggle('square',!!s.square);
    document.body.classList.toggle('no-animations',!s.animations);
    document.body.classList.toggle('solid-materials',!!s.reduceTransparency);
    document.body.classList.toggle('taskbar-labels',!!s.taskbarLabels);
    $('#startName').textContent=s.name;
    $('#desktopIcons').classList.toggle('is-hidden',!s.desktopIcons);
    store.set('settings',s);
  }

  function buildLaunchers(){
    $('#desktopIcons').innerHTML=''; $('#startApps').innerHTML='';
    apps.forEach(a=>{
      if(a.desktop){ const b=document.createElement('button'); b.className='desktop-icon'; b.innerHTML=`<span class="icon">${a.icon}</span><span class="label">${a.name}</span>`; b.ondblclick=()=>openApp(a.id); b.onclick=()=>{$$('.desktop-icon').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')}; $('#desktopIcons').append(b); }
      const b=document.createElement('button'); b.className='start-app'; b.dataset.search=(a.name+' '+a.id).toLowerCase(); b.innerHTML=`<span class="glyph">${a.icon}</span><span class="name">${a.name}</span>`; b.onclick=()=>{openApp(a.id);hideMenus()}; $('#startApps').append(b);
    });
    $('#recommended').innerHTML=`<button class="recommendation" data-open="notepad"><i>✎</i><span>Welcome.txt<small>Recently edited</small></span></button><button class="recommendation" data-open="paint"><i>✦</i><span>Paint<small>Create something local</small></span></button><button class="recommendation" data-open="settings"><i>⚙</i><span>Personalization<small>Make GovencoOS yours</small></span></button>`;
    $$('[data-open]').forEach(b=>b.onclick=()=>{openApp(b.dataset.open);hideMenus()});
  }

  function buildWidgets(){
    const el=$('#desktopWidgets'); el.classList.toggle('is-hidden',!state.settings.widgets);
    el.innerHTML=`<div class="widget clock-widget"><b id="widgetClock">00:00</b><span id="widgetDate"></span></div><div class="widget system-widget"><b>System health</b><small>All services operational</small><div class="meter"><i id="healthMeter"></i></div></div>`;
  }

  function bindShell(){
    $('#startButton').onclick=e=>{e.stopPropagation();toggleMenu('#startMenu');};
    $('#trayButton').onclick=e=>{e.stopPropagation();toggleMenu('#quickPanel');};
    $('#quickSettingsBtn').onclick=()=>{hideMenus();openApp('settings')};
    $('#appSearch').oninput=e=>{const q=e.target.value.toLowerCase();$$('.start-app').forEach(x=>x.classList.toggle('is-hidden',!x.dataset.search.includes(q)))};
    $('#restartBtn').onclick=()=>location.reload(); $('#shutdownBtn').onclick=shutdown; $('#lockBtn').onclick=lock;
    $('#unlockBtn').onclick=()=>$('#lockScreen').classList.add('is-hidden');
    $('#showDesktopBtn').onclick=()=>{state.windows.forEach(w=>w.el.classList.add('minimized'));$$('.taskbar-app').forEach(b=>b.classList.remove('active'));state.active=null};
    $('#brightnessRange').value=state.settings.brightness; $('#brightnessRange').oninput=e=>{state.settings.brightness=+e.target.value;applySettings()};
    $$('.quick-grid button').forEach(b=>b.onclick=()=>{b.classList.toggle('active'); const sm=$('small',b); sm.textContent=b.classList.contains('active')?(b.dataset.toggle==='sound'?'100%':'On'):'Off';});
    document.addEventListener('pointerdown',e=>{ if(!e.target.closest('.start-menu,.quick-panel,.start-button,.tray')) hideMenus(); if(!e.target.closest('.desktop-icon')) $$('.desktop-icon').forEach(x=>x.classList.remove('selected')); });
    $('#desktop').addEventListener('contextmenu',desktopContext);
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape')hideMenus();
      if(e.ctrlKey&&e.altKey&&e.key.toLowerCase()==='t'){e.preventDefault();openApp('terminal')}
      if(e.ctrlKey&&e.key===','){e.preventDefault();openApp('settings')}
    });
  }

  function toggleMenu(sel){ const target=$(sel), show=target.classList.contains('is-hidden'); hideMenus(); target.classList.toggle('is-hidden',!show); }
  function hideMenus(){ $('#startMenu').classList.add('is-hidden');$('#quickPanel').classList.add('is-hidden');$('#contextMenu').classList.add('is-hidden'); }

  function desktopContext(e){
    if(e.target.closest('.window,.taskbar,.start-menu,.quick-panel'))return; e.preventDefault();
    const m=$('#contextMenu'); m.innerHTML=`<button data-c="refresh">↻ Refresh</button><button data-c="new">＋ New text file</button><hr><button data-c="terminal">>_ Open Terminal</button><button data-c="settings">⚙ Personalize</button><hr><button data-c="icons">${state.settings.desktopIcons?'Hide':'Show'} desktop icons</button>`;
    m.style.left=Math.min(e.clientX,innerWidth-220)+'px';m.style.top=Math.min(e.clientY,innerHeight-250)+'px';m.classList.remove('is-hidden');
    $$('button',m).forEach(b=>b.onclick=()=>{const c=b.dataset.c;if(c==='refresh')toast('Desktop','Refreshed');if(c==='new'){state.files.push({name:'New file.txt',type:'text',content:''});saveFiles();toast('Files','New file created')}if(c==='terminal')openApp('terminal');if(c==='settings')openApp('settings');if(c==='icons'){state.settings.desktopIcons=!state.settings.desktopIcons;applySettings()}hideMenus()});
  }

  function openApp(id,opts={}){
    const app=apps.find(a=>a.id===id); if(!app)return;
    const key=opts.newWindow?id+'-'+Date.now():id;
    if(state.windows.has(key)){const w=state.windows.get(key);w.el.classList.remove('minimized');focusWindow(key);return w.el}
    const frag=$('#windowTemplate').content.cloneNode(true), win=$('.window',frag), content=$('.window-content',frag);
    win.dataset.id=key; $('.window-title',frag).textContent=app.name; $('.app-mark',frag).textContent=app.icon;
    win.style.width=Math.min(app.w,innerWidth-18)+'px';win.style.height=Math.min(app.h,innerHeight-90)+'px';
    win.style.left=Math.max(6,35+(state.windows.size*30)%260)+'px';win.style.top=Math.max(6,28+(state.windows.size*24)%170)+'px';win.style.zIndex=++state.z;
    $('#windowLayer').append(win); state.windows.set(key,{el:win,app}); app.render(content,{key,opts}); bindWindow(win,key);addTaskbar(key,app);focusWindow(key);return win;
  }

  function bindWindow(win,key){
    win.onpointerdown=()=>focusWindow(key);
    $('.window-controls',win).onclick=e=>{const a=e.target.dataset.action;if(a==='close')closeWindow(key);if(a==='min')minWindow(key);if(a==='max')toggleMax(win)};
    const bar=$('.titlebar',win); bar.ondblclick=()=>toggleMax(win);
    bar.onpointerdown=e=>{if(e.target.closest('button')||win.classList.contains('maximized'))return;e.preventDefault();focusWindow(key);const r=win.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;const mv=v=>{win.style.left=Math.max(-win.offsetWidth+120,Math.min(innerWidth-120,r.left+v.clientX-sx))+'px';win.style.top=Math.max(0,Math.min(innerHeight-110,r.top+v.clientY-sy))+'px'};const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up)};addEventListener('pointermove',mv);addEventListener('pointerup',up)};
    $('.resize-handle',win).onpointerdown=e=>{if(win.classList.contains('maximized'))return;e.preventDefault();const r=win.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;const mv=v=>{win.style.width=Math.max(340,Math.min(innerWidth-r.left,r.width+v.clientX-sx))+'px';win.style.height=Math.max(230,Math.min(innerHeight-r.top-78,r.height+v.clientY-sy))+'px'};const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up)};addEventListener('pointermove',mv);addEventListener('pointerup',up)};
  }
  function focusWindow(key){const item=state.windows.get(key);if(!item)return;$$('.window').forEach(w=>w.classList.remove('focused'));$$('.taskbar-app').forEach(b=>b.classList.remove('active'));item.el.classList.remove('minimized');item.el.classList.add('focused');item.el.style.zIndex=++state.z;const b=$(`.taskbar-app[data-id="${CSS.escape(key)}"]`);if(b)b.classList.add('active');state.active=key}
  function closeWindow(key){const i=state.windows.get(key);if(!i)return;i.el.remove();state.windows.delete(key);$(`.taskbar-app[data-id="${CSS.escape(key)}"]`)?.remove();if(state.active===key)state.active=null}
  function minWindow(key){state.windows.get(key)?.el.classList.add('minimized');$(`.taskbar-app[data-id="${CSS.escape(key)}"]`)?.classList.remove('active');if(state.active===key)state.active=null}
  function toggleMax(win){win.classList.toggle('maximized')}
  function addTaskbar(key,app){const b=document.createElement('button');b.className='taskbar-app running';b.dataset.id=key;b.title=app.name;b.innerHTML=`<span>${app.icon}</span><small>${app.name}</small>`;b.onclick=()=>{const w=state.windows.get(key);if(!w)return;if(w.el.classList.contains('minimized'))focusWindow(key);else if(state.active===key&&w.el.classList.contains('focused'))minWindow(key);else focusWindow(key)};$('#taskbarApps').append(b)}

  function updateClock(){const n=new Date(),opts={hour:'2-digit',minute:'2-digit',hour12:!state.settings.clock24},t=n.toLocaleTimeString([],opts),d=n.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});$('#clock').innerHTML=`<b>${t}</b>${d}`;$('#quickTime').textContent=t;if($('#widgetClock')){$('#widgetClock').textContent=t;$('#widgetDate').textContent=n.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'})}if($('#lockTime')){$('#lockTime').textContent=t;$('#lockDate').textContent=n.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric',year:'numeric'})}if($('#healthMeter'))$('#healthMeter').style.width=(35+Math.random()*25)+'%'}
  function toast(title,text){const t=document.createElement('div');t.className='toast';t.innerHTML=`<b>${esc(title)}</b><span>${esc(text)}</span>`;$('#toastArea').append(t);setTimeout(()=>t.remove(),2800)}
  function shutdown(){hideMenus();const o=document.createElement('div');o.className='boot';o.innerHTML='<div class="boot-orb"><span>G</span></div><h1>GovencoOS is off</h1><p>Safe to close this tab.</p><button id="powerOn" style="margin-top:25px;padding:11px 18px;border-radius:12px;background:#1d2130;cursor:pointer">Power on</button>';document.body.append(o);$('#powerOn').onclick=()=>location.reload()}
  function lock(){hideMenus();$('#lockScreen').classList.remove('is-hidden')}
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function saveFiles(){store.set('files',state.files)}

  function renderNotepad(root,ctx){
    let file=ctx.opts.file||null, initial=file?.content??store.get('note','');
    root.innerHTML=`<div class="app-shell"><div class="toolbar"><button data-new>New</button><button data-save>Save</button><button data-saveas>Save as</button><button data-wrap>Word wrap</button><span class="spacer"></span><select data-font><option>14</option><option>16</option><option>18</option><option>20</option></select></div><textarea class="notepad" spellcheck="true"></textarea><div class="statusbar">Ready</div></div>`;
    const a=$('.notepad',root),status=$('.statusbar',root);a.value=initial;
    const update=()=>status.textContent=`${a.value.length} characters · ${a.value.split(/\s+/).filter(Boolean).length} words · ${a.value.split('\n').length} lines`;a.oninput=update;update();
    $('[data-new]',root).onclick=()=>{a.value='';file=null;update()};
    $('[data-save]',root).onclick=()=>{if(file){file.content=a.value;saveFiles()}else store.set('note',a.value);toast('Notepad','Saved successfully')};
    $('[data-saveas]',root).onclick=()=>{const name=prompt('File name','Note.txt');if(!name)return;file={name,type:'text',content:a.value};state.files.push(file);saveFiles();toast('Files',name+' saved')};
    $('[data-wrap]',root).onclick=e=>{a.style.whiteSpace=a.style.whiteSpace==='nowrap'?'pre-wrap':'nowrap';e.target.textContent=a.style.whiteSpace==='nowrap'?'Word wrap: off':'Word wrap: on'};
    $('[data-font]',root).onchange=e=>a.style.fontSize=e.target.value+'px';
  }

  function renderCalculator(root){
    const keys=['C','⌫','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','±','0','.','='];let expr='';
    root.innerHTML=`<div class="calc"><div class="calc-display"><small data-expr></small><b data-result>0</b></div><div class="calc-grid"></div></div>`;
    const grid=$('.calc-grid',root),ex=$('[data-expr]',root),res=$('[data-result]',root);
    const draw=()=>{ex.textContent=expr;res.textContent=expr||'0'};
    keys.forEach(k=>{const b=document.createElement('button');b.textContent=k;if('÷×−+%'.includes(k))b.className='op';if(k==='=')b.className='equals';b.onclick=()=>{if(k==='C')expr='';else if(k==='⌫')expr=expr.slice(0,-1);else if(k==='±')expr=expr.startsWith('-')?expr.slice(1):'-'+expr;else if(k==='='){try{const safe=expr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');if(!/^[0-9+\-*/().% ]+$/.test(safe))throw 0;const v=Function('return ('+safe+')')();ex.textContent=expr;res.textContent=Number.isFinite(v)?String(Math.round(v*1e10)/1e10):'Error';expr=String(v)}catch{res.textContent='Error'}}else expr+=(expr==='0'?'': '')+k;draw()};grid.append(b)});draw();
  }

  function renderTerminal(root){
    root.innerHTML=`<div class="terminal"><div class="terminal-output"><div class="terminal-line success">GovencoOS Terminal 0.1</div><div class="terminal-line muted">Type 'help' to see available commands.</div></div><div class="terminal-input-row"><span class="terminal-prompt">${esc(state.settings.name.toLowerCase().replace(/\s+/g,'_'))}@govenco:~$</span><input class="terminal-input" autocomplete="off" spellcheck="false"></div></div>`;
    const out=$('.terminal-output',root),input=$('.terminal-input',root);setTimeout(()=>input.focus(),0);
    const line=(text,cls='')=>{const d=document.createElement('div');d.className='terminal-line '+cls;d.textContent=text;out.append(d);out.scrollTop=out.scrollHeight};
    const html=(content)=>{const d=document.createElement('div');d.className='terminal-line';d.innerHTML=content;out.append(d);out.scrollTop=out.scrollHeight};
    const cmds={
      help:()=>html('<span class="cmd">help clear echo date time whoami hostname version apps open ls cat touch rm rename write theme accent wallpaper settings history calc uptime neofetch pwd storage export reset reboot shutdown lock</span>'),
      clear:()=>out.innerHTML='', echo:a=>line(a.join(' ')), date:()=>line(new Date().toDateString()),time:()=>line(new Date().toLocaleTimeString()),
      whoami:()=>line(state.settings.name),hostname:()=>line('govenco-desktop'),version:()=>line('GovencoOS Web Edition 0.1'),
      apps:()=>line(apps.map(a=>a.id).join('  ')), open:a=>{const id=(a[0]||'').toLowerCase();apps.some(x=>x.id===id)?(openApp(id),line('Opened '+id,'success')):line('App not found: '+id,'error')},
      ls:()=>line(state.files.map(f=>(f.type==='folder'?'[DIR] ':'')+f.name).join('\n')),
      cat:a=>{const f=state.files.find(x=>x.name.toLowerCase()===(a.join(' ')||'').toLowerCase());f&&f.type==='text'?line(f.content):line('File not found','error')},
      touch:a=>{const n=a.join(' ')||'New file.txt';state.files.push({name:n,type:'text',content:''});saveFiles();line('Created '+n,'success')},
      rm:a=>{const n=a.join(' '),i=state.files.findIndex(x=>x.name.toLowerCase()===n.toLowerCase());if(i<0)line('File not found','error');else{state.files.splice(i,1);saveFiles();line('Removed '+n,'success')}},
      rename:a=>{const old=a[0],next=a[1],f=state.files.find(x=>x.name.toLowerCase()===(old||'').toLowerCase());if(!f||!next)return line('Usage: rename old.txt new.txt','error');f.name=next;saveFiles();line('Renamed to '+next,'success')},
      write:a=>{const name=a.shift(),f=state.files.find(x=>x.name.toLowerCase()===(name||'').toLowerCase());if(!f||f.type!=='text')return line('Usage: write file.txt text','error');f.content=a.join(' ');saveFiles();line('Saved '+f.name,'success')},
      theme:a=>{const n=a[0];if(!themes[n])return line('Themes: '+Object.keys(themes).join(', '));state.settings.theme=n;state.settings.accent=themes[n].accent;state.settings.accent2=themes[n].accent2;applySettings();line('Theme changed to '+n,'success')},
      accent:a=>{if(!/^#[0-9a-f]{6}$/i.test(a[0]||''))return line('Usage: accent #ff3158','error');state.settings.accent=a[0];applySettings();line('Accent updated','success')},
      wallpaper:a=>{const n=a[0];if(!wallpapers[n])return line('Wallpapers: '+Object.keys(wallpapers).join(', '));state.settings.wallpaper=n;applySettings();line('Wallpaper changed','success')},
      settings:()=>openApp('settings'), history:()=>line(state.history.join('\n')), pwd:()=>line('/home/'+state.settings.name.toLowerCase().replace(/\s+/g,'_')),
      storage:()=>line(`${state.files.length} items · ${new Blob([JSON.stringify(state.files)]).size} bytes used locally`),
      export:()=>{const blob=new Blob([JSON.stringify({settings:state.settings,files:state.files},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='govencoos-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);line('Backup exported','success')},
      reset:()=>{if(confirm('Reset GovencoOS completely?')){try{Object.keys(localStorage).filter(k=>k.startsWith('govenco.')).forEach(k=>localStorage.removeItem(k))}catch{};document.cookie=cookieName+'=; Path=/; Max-Age=0; SameSite=Lax; Secure';location.reload()}},
      calc:a=>{try{const s=a.join(' ');if(!/^[0-9+\-*/().% ]+$/.test(s))throw 0;line(String(Function('return ('+s+')')()))}catch{line('Invalid expression','error')}},
      uptime:()=>line(Math.floor(performance.now()/1000)+' seconds'),
      neofetch:()=>html(`<span class="cmd">   GGGG</span>   ${esc(state.settings.name)}@govenco<br><span class="cmd">  GG</span>      OS: GovencoOS 0.1<br><span class="cmd">  GG GGG</span>  Shell: Govenco Terminal<br><span class="cmd">  GG  GG</span>  Theme: ${esc(state.settings.theme)}<br><span class="cmd">   GGGG</span>   Apps: ${apps.length}`),
      reboot:()=>location.reload(),shutdown:()=>shutdown(),lock:()=>lock()
    };
    const run=()=>{const raw=input.value.trim();if(!raw)return;line(state.settings.name.toLowerCase().replace(/\s+/g,'_')+'@govenco:~$ '+raw,'cmd');state.history.push(raw);state.hIndex=state.history.length;const [c,...a]=raw.match(/(?:[^\s"]+|"[^"]*")+/g)||[];input.value='';const args=a.map(x=>x.replace(/^"|"$/g,''));cmds[(c||'').toLowerCase()]?cmds[c.toLowerCase()](args):line(`Command not found: ${c}. Type 'help'.`,'error')};
    input.onkeydown=e=>{if(e.key==='Enter')run();if(e.key==='ArrowUp'){e.preventDefault();state.hIndex=Math.max(0,state.hIndex-1);input.value=state.history[state.hIndex]||''}if(e.key==='ArrowDown'){e.preventDefault();state.hIndex=Math.min(state.history.length,state.hIndex+1);input.value=state.history[state.hIndex]||''}if(e.key==='l'&&e.ctrlKey){e.preventDefault();out.innerHTML=''}};
  }

  function renderFiles(root){
    root.innerHTML=`<div class="files"><aside class="sidebar"><button class="active">⌂ Home</button><button>▣ Documents</button><button>▤ Pictures</button><button>☆ Favorites</button><button>⌫ Trash</button></aside><main class="file-main"><div class="toolbar"><button data-newfile>＋ File</button><button data-folder>＋ Folder</button><button data-refresh>↻</button><span class="spacer"></span><input data-search placeholder="Search files"></div><div class="breadcrumbs">Home / Local storage</div><div class="file-grid"></div><div class="statusbar"></div></main></div>`;
    const grid=$('.file-grid',root),status=$('.statusbar',root),search=$('[data-search]',root);
    const draw=()=>{const q=search.value.toLowerCase();grid.innerHTML='';state.files.filter(f=>f.name.toLowerCase().includes(q)).forEach(f=>{const b=document.createElement('button');b.className='file-card';b.innerHTML=`<i>${f.type==='folder'?'▰':'▤'}</i><span>${esc(f.name)}</span>`;b.ondblclick=()=>{if(f.type==='text')openApp('notepad',{newWindow:true,file:f});else toast('Files','Folder is empty')};b.oncontextmenu=e=>{e.preventDefault();if(confirm('Delete '+f.name+'?')){state.files=state.files.filter(x=>x!==f);saveFiles();draw()}};grid.append(b)});status.textContent=`${state.files.length} items · stored locally`};
    search.oninput=draw;$('[data-refresh]',root).onclick=draw;$('[data-newfile]',root).onclick=()=>{const n=prompt('File name','New file.txt');if(n){state.files.push({name:n,type:'text',content:''});saveFiles();draw()}};$('[data-folder]',root).onclick=()=>{const n=prompt('Folder name','New folder');if(n){state.files.push({name:n,type:'folder'});saveFiles();draw()}};draw();
  }

  function renderSettings(root){
    root.innerHTML=`<div class="settings"><aside class="settings-nav"><h2>Settings</h2><button class="active" data-page="personal">◈ Personalization</button><button data-page="appearance">◐ Appearance</button><button data-page="desktop">▣ Desktop</button><button data-page="system">⌁ System</button><button data-page="account">♙ Account</button><button data-page="about">ⓘ About</button></aside><section class="settings-content"></section></div>`;
    const content=$('.settings-content',root);const show=p=>{$$('.settings-nav button',root).forEach(b=>b.classList.toggle('active',b.dataset.page===p));
      if(p==='personal')content.innerHTML=personalHTML();
      if(p==='appearance')content.innerHTML=appearanceHTML();
      if(p==='desktop')content.innerHTML=desktopHTML();
      if(p==='system')content.innerHTML=systemHTML();
      if(p==='account')content.innerHTML=accountHTML();
      if(p==='about')content.innerHTML=aboutHTML();
      bindSettingsPage(content,p);
    };$$('.settings-nav button',root).forEach(b=>b.onclick=()=>show(b.dataset.page));show('personal');
  }

  function personalHTML(){return `<h2>Personalization</h2><div class="setting-card"><h3>Theme presets</h3><p>Change the whole character of GovencoOS.</p><div class="theme-grid">${Object.keys(themes).map(n=>`<button class="theme-option ${state.settings.theme===n?'active':''}" data-theme="${n}"><span style="background:linear-gradient(135deg,${themes[n].accent},${themes[n].accent2})"></span><small>${n}</small></button>`).join('')}</div></div><div class="setting-card"><h3>Wallpaper</h3><p>Choose a built-in dynamic background.</p><div class="wallpaper-grid">${Object.keys(wallpapers).map(n=>`<button class="wallpaper-option ${state.settings.wallpaper===n?'active':''}" data-wallpaper="${n}" style="background:${wallpapers[n]}"></button>`).join('')}</div></div><div class="setting-card"><div class="control-row"><span>Primary accent</span><input data-key="accent" type="color" value="${state.settings.accent}"></div><div class="control-row"><span>Secondary accent</span><input data-key="accent2" type="color" value="${state.settings.accent2}"></div></div>`}
  function appearanceHTML(){return `<h2>Appearance</h2><div class="setting-card"><h3>Window materials</h3><p>Tune blur, shape and density.</p><div class="control-row"><span>Corner radius</span><input data-key="radius" type="range" min="0" max="30" value="${state.settings.radius}"></div><div class="control-row"><span>Glass blur</span><input data-key="blur" type="range" min="0" max="45" value="${state.settings.blur}"></div><div class="control-row"><span>Font size</span><input data-key="fontScale" type="range" min="0.85" max="1.25" step="0.05" value="${state.settings.fontScale}"></div></div><div class="setting-card"><label><input data-bool="compact" type="checkbox" ${state.settings.compact?'checked':''}> Compact mode</label><br><br><label><input data-bool="square" type="checkbox" ${state.settings.square?'checked':''}> Sharp corners</label><br><br><label><input data-bool="animations" type="checkbox" ${state.settings.animations?'checked':''}> Interface animations</label><br><br><label><input data-bool="reduceTransparency" type="checkbox" ${state.settings.reduceTransparency?'checked':''}> Solid window materials</label><br><br><label><input data-bool="taskbarLabels" type="checkbox" ${state.settings.taskbarLabels?'checked':''}> Show taskbar labels</label></div>`}
  function desktopHTML(){return `<h2>Desktop</h2><div class="setting-card"><h3>Desktop elements</h3><p>Choose what appears on your workspace.</p><label><input data-bool="widgets" type="checkbox" ${state.settings.widgets?'checked':''}> Show widgets</label><br><br><label><input data-bool="desktopIcons" type="checkbox" ${state.settings.desktopIcons?'checked':''}> Show desktop icons</label><div class="control-row"><span>Icon size</span><input data-key="iconScale" type="range" min="0.8" max="1.35" step="0.05" value="${state.settings.iconScale}"></div><div class="control-row"><span>Wallpaper blur</span><input data-key="wallpaperBlur" type="range" min="0" max="18" value="${state.settings.wallpaperBlur}"></div></div>`}
  function systemHTML(){return `<h2>System</h2><div class="setting-card"><h3>Display</h3><div class="control-row"><span>Brightness</span><input data-key="brightness" type="range" min="55" max="115" value="${state.settings.brightness}"></div></div><div class="setting-card"><h3>Local storage</h3><p>${state.files.length} virtual items are stored only for this site in this browser.</p><button data-export class="field">Export backup</button> <button data-import class="field">Import backup</button><input data-import-file type="file" accept="application/json" hidden></div><div class="setting-card"><h3>Reset</h3><p>Clearing browser cookies/site data also resets GovencoOS automatically.</p><button data-reset-files class="field">Reset virtual files</button> <button data-reset class="field">Restore appearance</button> <button data-reset-all class="field danger-field">Erase GovencoOS</button></div>`}
  function accountHTML(){return `<h2>Account</h2><div class="setting-card"><h3>Local profile</h3><p>This profile never leaves your device.</p><div class="control-row"><span>Display name</span><input data-name class="field" value="${esc(state.settings.name)}" maxlength="24"></div><br><label><input data-bool="clock24" type="checkbox" ${state.settings.clock24?'checked':''}> Use 24-hour clock</label></div>`}
  function aboutHTML(){return `<h2>About</h2><div class="setting-card"><div class="about-logo">G</div><h2>GovencoOS 0.1</h2><p>Web Edition · Local-first desktop environment</p><p>Built as a self-contained browser OS prototype. No account, server or installation required.</p></div>`}
  function bindSettingsPage(c,p){
    $$('[data-theme]',c).forEach(b=>b.onclick=()=>{const n=b.dataset.theme;state.settings.theme=n;state.settings.accent=themes[n].accent;state.settings.accent2=themes[n].accent2;applySettings();buildWidgets();toast('Personalization','Theme changed to '+n);openSettingsRefresh(c,p)});
    $$('[data-wallpaper]',c).forEach(b=>b.onclick=()=>{state.settings.wallpaper=b.dataset.wallpaper;applySettings();openSettingsRefresh(c,p)});
    $$('[data-key]',c).forEach(i=>i.oninput=()=>{const k=i.dataset.key;state.settings[k]=i.type==='range'?+i.value:i.value;applySettings();if(k==='widgets')buildWidgets()});
    $$('[data-bool]',c).forEach(i=>i.onchange=()=>{state.settings[i.dataset.bool]=i.checked;applySettings();buildWidgets()});
    $('[data-name]',c)?.addEventListener('input',e=>{state.settings.name=e.target.value||'Guest';applySettings()});
    $('[data-reset]',c)?.addEventListener('click',()=>{state.settings={...defaults};applySettings();buildWidgets();toast('Settings','Defaults restored');openSettingsRefresh(c,p)});
    $('[data-reset-files]',c)?.addEventListener('click',()=>{if(confirm('Reset all virtual files?')){localStorage.removeItem('govenco.files');location.reload()}});
    $('[data-export]',c)?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify({settings:state.settings,files:state.files},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='govencoos-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)});
    $('[data-import]',c)?.addEventListener('click',()=> $('[data-import-file]',c)?.click());
    $('[data-import-file]',c)?.addEventListener('change',async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(data.settings)store.set('settings',data.settings);if(Array.isArray(data.files))store.set('files',data.files);location.reload()}catch{alert('Invalid GovencoOS backup')}});
    $('[data-reset-all]',c)?.addEventListener('click',()=>{if(confirm('Erase every GovencoOS setting and file?')){try{Object.keys(localStorage).filter(k=>k.startsWith('govenco.')).forEach(k=>localStorage.removeItem(k))}catch{};document.cookie=cookieName+'=; Path=/; Max-Age=0; SameSite=Lax; Secure';location.reload()}});
  }
  function openSettingsRefresh(c,p){const parent=c.closest('.settings');setTimeout(()=>{const btn=$(`[data-page="${p}"]`,parent);btn?.click()},0)}

  function renderPaint(root){
    root.innerHTML=`<div class="app-shell paint-app"><div class="toolbar"><input data-color type="color" value="${state.settings.accent}"><input data-size type="range" min="1" max="32" value="6"><button data-clear>Clear</button><button data-save>Save PNG</button><span class="spacer"></span><small>Local canvas</small></div><div class="paint-stage"><canvas></canvas></div></div>`;
    const canvas=$('canvas',root),stage=$('.paint-stage',root),ctx=canvas.getContext('2d');let drawing=false,last=null;
    const resize=()=>{const r=stage.getBoundingClientRect(),copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(canvas,0,0);canvas.width=Math.max(1,Math.floor(r.width));canvas.height=Math.max(1,Math.floor(r.height));ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(copy,0,0)};setTimeout(resize,0);
    const pos=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}};
    canvas.onpointerdown=e=>{drawing=true;last=pos(e);canvas.setPointerCapture(e.pointerId)};
    canvas.onpointermove=e=>{if(!drawing)return;const p=pos(e);ctx.strokeStyle=$('[data-color]',root).value;ctx.lineWidth=+$('[data-size]',root).value;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p};
    canvas.onpointerup=canvas.onpointercancel=()=>drawing=false;
    $('[data-clear]',root).onclick=()=>{ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height)};
    $('[data-save]',root).onclick=()=>{const a=document.createElement('a');a.download='GovencoOS-Paint.png';a.href=canvas.toDataURL('image/png');a.click();toast('Paint','PNG exported')};
  }

  function renderClock(root){
    root.innerHTML=`<div class="clock-app"><div class="clock-face"><div class="clock-now" data-now></div><div class="clock-full" data-full></div></div><div class="clock-cards"><div><small>Local time</small><b data-zone></b></div><div><small>Session uptime</small><b data-up></b></div></div></div>`;
    const tick=()=>{if(!document.body.contains(root))return;const n=new Date();$('[data-now]',root).textContent=n.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:!state.settings.clock24});$('[data-full]',root).textContent=n.toLocaleDateString([],{weekday:'long',year:'numeric',month:'long',day:'numeric'});$('[data-zone]',root).textContent=Intl.DateTimeFormat().resolvedOptions().timeZone||'Local';$('[data-up]',root).textContent=Math.floor(performance.now()/1000)+' sec';setTimeout(tick,1000)};tick();
  }

  function renderMonitor(root){
    root.innerHTML=`<div class="app-shell"><div class="toolbar"><b>Performance overview</b><span class="spacer"></span><span style="color:var(--muted)">Live simulation</span></div><div class="pane"><div class="monitor-grid"><div class="stat-card"><small>CPU</small><b id="cpuVal">24%</b></div><div class="stat-card"><small>Memory</small><b id="memVal">3.8 GB</b></div><div class="stat-card"><small>Processes</small><b>${state.windows.size+18}</b></div></div><div class="chart" id="chart"></div></div></div>`;
    const chart=$('#chart',root);for(let i=0;i<32;i++){const b=document.createElement('i');b.style.height=(15+Math.random()*70)+'%';chart.append(b)}
    const timer=setInterval(()=>{if(!document.body.contains(root)){clearInterval(timer);return}const bars=$$('i',chart);bars.shift()?.remove();const b=document.createElement('i');b.style.height=(15+Math.random()*78)+'%';chart.append(b);$('#cpuVal',root).textContent=Math.round(10+Math.random()*55)+'%';$('#memVal',root).textContent=(3.1+Math.random()*1.4).toFixed(1)+' GB'},900);
  }
  function renderAbout(root){root.innerHTML=`<div class="pane"><div class="about-logo">G</div><h1>GovencoOS</h1><p style="color:var(--muted)">Web Edition 0.1</p><p>A customizable local desktop experience with windows, apps, a virtual file system and a command shell.</p><div class="setting-card"><b>Keyboard shortcuts</b><p>Ctrl + Alt + T — Terminal<br>Ctrl + , — Settings<br>Esc — Close menus</p></div></div>`}

  boot();
})();
