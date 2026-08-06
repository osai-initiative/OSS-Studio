import { appPage } from "./app";

const NEW_STUDIO_STYLE = `<style>
body.studio-new{--new-shell:1040px;--new-chat:820px;overflow:hidden;background:#000}
.studio-new .shell{display:block;min-height:100dvh}
.studio-new .main{width:100%;max-width:var(--new-shell);height:100dvh;min-height:0;margin:0 auto;padding:18px 28px 0;display:grid;grid-template-rows:54px minmax(0,1fr) auto}
.studio-new .top{grid-row:1;display:flex;align-items:center;justify-content:space-between;width:100%;height:46px;padding:0 2px}
.studio-new-brand{display:inline-flex;align-items:baseline;gap:9px;color:var(--text);font:700 20px/1 'Playfair Display',serif;letter-spacing:-.055em;white-space:nowrap}
.studio-new-brand i{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px rgba(52,209,126,.1)}
.studio-new-brand small{color:var(--faint);font:500 9px/1 'DM Mono';letter-spacing:.12em;text-transform:uppercase}
.studio-new-actions{display:flex;align-items:center;gap:6px}
.studio-new .status{margin-right:8px;color:var(--faint);font-size:10px;letter-spacing:.04em}
.studio-new .status b{width:6px;height:6px;font-size:0;border-radius:50%;background:var(--green)}
.studio-new .model{display:none}
.studio-new-action{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:34px;border:1px solid transparent;border-radius:10px;padding:0 10px;background:transparent;color:var(--muted);font:600 11px Manrope;cursor:pointer;transition:color .16s,border-color .16s,background .16s}
.studio-new-action:hover{color:var(--text);border-color:var(--line);background:rgba(255,255,255,.035)}
.studio-new-action.primary{border-color:var(--line);color:var(--text)}
.studio-new-action svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.7}
.studio-new .welcome{grid-row:2;align-self:end;width:min(100%,var(--new-chat));max-width:none;margin:0 auto 25px}
.studio-new .eyebrow{font-size:10px;letter-spacing:.14em}
.studio-new .eyebrow::before{width:18px}
.studio-new .welcome h1{max-width:700px;margin:14px 0 12px;font-size:clamp(42px,5.3vw,68px);line-height:.98;letter-spacing:-.052em}
.studio-new .welcome p{max-width:590px;font-size:14px;line-height:1.65}
.studio-new .chips{display:flex;flex-wrap:wrap;gap:7px;max-width:760px;margin-top:22px}
.studio-new .chip{min-width:0;border-radius:999px;padding:9px 13px;background:transparent;color:var(--muted);font-size:11px;line-height:1.25}
.studio-new .chip:hover{transform:none;color:var(--text);border-color:rgba(52,209,126,.34);background:var(--green-dim)}
.studio-new .chip .arrow{display:none}
.studio-new .feed{grid-row:2;align-self:stretch;width:min(100%,var(--new-chat));max-width:none;min-height:0;margin:0 auto;padding:30px 6px 34px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--line2) transparent;align-content:start}
.studio-new .message{font-size:14px;line-height:1.75}
.studio-new .message.user{max-width:min(78%,640px);border-color:rgba(52,209,126,.18);border-radius:17px 17px 4px 17px;padding:12px 16px;background:rgba(52,209,126,.09)}
.studio-new .message.assistant{max-width:760px;padding:2px 1px}
.studio-new .composer{grid-row:3;position:relative;bottom:auto;width:min(100%,var(--new-chat));margin:0 auto;padding:0 0 16px;background:linear-gradient(transparent,rgba(0,0,0,.94) 22%);backdrop-filter:none}
.studio-new .box{position:relative;border-radius:22px;padding:12px 12px 11px;background:#0b0b0c;border-color:rgba(255,255,255,.13);box-shadow:0 24px 80px rgba(0,0,0,.5)}
.studio-new .box::before{content:'';position:absolute;top:-1px;left:28px;width:44px;height:1px;background:var(--green);box-shadow:0 0 14px rgba(52,209,126,.48)}
.studio-new .box:focus-within{border-color:rgba(52,209,126,.42);box-shadow:0 24px 80px rgba(0,0,0,.5),0 0 0 3px rgba(52,209,126,.07)}
.studio-new .box textarea{min-height:70px;max-height:180px;padding:7px 8px 13px;font-size:14px}
.studio-new .box textarea:focus-visible{outline:0}
.studio-new .tools{gap:7px;padding:0}
.studio-new .seg{gap:2px;padding:3px;border-radius:12px;background:rgba(255,255,255,.025)}
.studio-new .seg .mode{position:relative;padding:8px 12px 8px 24px;border-radius:9px;color:var(--muted);font-size:11px}
.studio-new .seg .mode::before{content:'';position:absolute;left:11px;top:50%;width:5px;height:5px;margin-top:-2.5px;border:1px solid currentColor;border-radius:50%}
.studio-new .seg .mode.active{color:var(--text);background:#171719;box-shadow:none}
.studio-new .seg .mode.active::before{border-color:var(--green);background:var(--green);box-shadow:0 0 0 3px rgba(52,209,126,.1)}
.studio-new .right{gap:6px}
.studio-new .right .mode{height:34px;max-width:155px;border-color:var(--line);border-radius:10px;padding:0 28px 0 10px;background:#111113;color:var(--muted);font-size:11px}
.studio-new .send{height:34px;min-width:72px;border-radius:10px;padding:0 14px}
.studio-new .hint{padding-top:8px;text-align:center;font-size:9px;letter-spacing:.03em}
.studio-new .swarm{margin-bottom:7px;font-size:10px;letter-spacing:.02em}
.studio-new .studio-utility{display:none!important}
.studio-new .studio-drawer{top:10px;right:10px;bottom:10px;border-radius:16px}
.studio-new .side{position:fixed;inset:10px auto 10px 10px;z-index:70;display:flex!important;width:min(300px,calc(100vw - 20px));height:auto;min-height:0;padding:18px 14px;border:1px solid var(--line2);border-radius:16px;background:rgba(11,11,12,.98);box-shadow:0 30px 100px rgba(0,0,0,.72);transform:translateX(calc(-100% - 20px));transition:transform .22s ease;overflow:hidden}
.studio-new .side.open{transform:none}
.studio-new .side .logo{display:flex;align-items:center;justify-content:space-between;padding:4px 8px 20px;font-size:20px}
.studio-new .side .new{justify-content:center}
.studio-new-side-close{display:grid;place-items:center;width:30px;height:30px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--muted);font:18px/1 Manrope;cursor:pointer}
.studio-new-side-close:hover{color:var(--text);border-color:var(--line2)}
.studio-new-history-backdrop{position:fixed;inset:0;z-index:65;background:rgba(0,0,0,.58);opacity:0;pointer-events:none;transition:opacity .2s}
.studio-new-history-backdrop.open{opacity:1;pointer-events:auto}
.studio-new-empty .composer{margin-bottom:clamp(52px,10vh,104px)}
.studio-new :focus-visible{outline:2px solid var(--green);outline-offset:2px}
.studio-new.light{background:#f5f7f3}
.studio-new.light .composer{background:linear-gradient(transparent,rgba(245,247,243,.96) 22%)}
.studio-new.light .box{background:#fff}
.studio-new.light .side{background:rgba(255,255,255,.98)}
@media(max-width:760px){
  .studio-new .main{padding:max(8px,env(safe-area-inset-top)) 12px 0;grid-template-rows:52px minmax(0,1fr) auto}
  .studio-new .top{height:44px}
  .studio-new-brand{font-size:18px}.studio-new-brand small,.studio-new .status{display:none}
  .studio-new-actions{gap:4px}.studio-new-action{width:auto;min-width:44px;height:44px;padding:0 8px;font-size:11px}.studio-new-action svg{display:none}
  .studio-new .welcome{margin-bottom:16px}.studio-new .welcome h1{font-size:clamp(39px,12.5vw,54px)}
  .studio-new .welcome p{font-size:13px}.studio-new .chips{max-width:none;margin:16px -12px 0;padding:0 12px 3px;gap:6px;flex-wrap:nowrap;overflow-x:auto;scroll-snap-type:x proximity;scrollbar-width:none}.studio-new .chips::-webkit-scrollbar{display:none}.studio-new .chip{flex:0 0 auto;padding:9px 12px;scroll-snap-align:start}
  .studio-new .feed{padding:16px 2px 20px}.studio-new .message{font-size:15px;line-height:1.7}.studio-new .message.user{max-width:92%;padding:11px 14px}
  .studio-new .composer{padding-bottom:max(8px,env(safe-area-inset-bottom))}.studio-new-empty .composer{margin-bottom:clamp(72px,14dvh,116px)}
  .studio-new .box{border-radius:18px;padding:10px}.studio-new .box textarea{min-height:58px;padding:7px 8px 10px;font-size:16px;line-height:1.5}
  .studio-new .tools{align-items:stretch}.studio-new .seg{width:100%;display:grid;grid-template-columns:repeat(3,1fr)}
  .studio-new .seg .mode{min-height:44px;padding:8px 5px 8px 18px;font-size:12px}.studio-new .seg .mode::before{left:8px}
  .studio-new .right{width:100%;margin-left:0;display:grid;grid-template-columns:minmax(0,.86fr) minmax(0,1.14fr) auto}
  .studio-new .right .mode{width:100%;max-width:none;height:44px;padding-left:10px;font-size:16px}.studio-new .right .mode.hidden{display:none}.studio-new .send{min-width:64px;height:44px;padding:0 13px;font-size:13px}
  .studio-new .hint{display:none}
  .studio-new-keyboard.studio-new-empty .welcome{visibility:hidden}.studio-new-keyboard.studio-new-empty .composer{margin-bottom:0}
  .studio-new .side{inset:auto 6px 6px;width:auto;height:min(64dvh,540px);border-radius:20px 20px 16px 16px;padding:24px 14px max(14px,env(safe-area-inset-bottom));transform:translateY(calc(100% + 14px))}
  .studio-new .side::before,.studio-new .studio-drawer::before{content:'';position:absolute;z-index:2;top:8px;left:50%;width:34px;height:3px;border-radius:99px;background:var(--line2);transform:translateX(-50%)}
  .studio-new .side.open{transform:none}
  .studio-new .studio-drawer{inset:auto 6px 6px;top:auto;right:6px;bottom:6px;left:6px;width:auto;height:min(82dvh,700px);border-radius:20px 20px 16px 16px;transform:translateY(calc(100% + 14px));transition:transform .22s ease}
  .studio-new .studio-drawer.open{transform:none}
  .studio-new .studio-drawer-head{padding-top:24px}.studio-new .studio-tabs{scrollbar-width:none}.studio-new .studio-tabs::-webkit-scrollbar{display:none}
  .studio-new .studio-drawer-backdrop,.studio-new-history-backdrop{background:rgba(0,0,0,.68)}
}
@media(max-width:360px){.studio-new-brand{font-size:17px}.studio-new-action{padding:0 6px}.studio-new .seg .mode{font-size:11px}.studio-new .right .mode{font-size:15px}}
@media(prefers-reduced-motion:reduce){.studio-new *{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
</style>`;

const NEW_STUDIO_SCRIPT = `<script>(function(){
const body=document.body,top=document.querySelector('.top'),side=document.querySelector('.side'),welcome=document.querySelector('#welcome');
if(!top||!side||!welcome)return;
const icon=(path)=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';
const brand=document.createElement('div');brand.className='studio-new-brand';brand.innerHTML='OSS Studio <i></i><small>New</small>';
const actions=document.createElement('div');actions.className='studio-new-actions';
const status=top.querySelector('.status'),model=top.querySelector('.model');
if(status)actions.append(status);if(model)actions.append(model);
const action=(name,label,path,primary)=>{const button=document.createElement('button');button.type='button';button.className='studio-new-action'+(primary?' primary':'');button.dataset.action=name;button.setAttribute('aria-label',label);button.innerHTML=icon(path)+'<span>'+label+'</span>';actions.append(button);return button};
const fresh=action('new','New chat','M12 5v14M5 12h14',true);
const recents=action('recents','Recents','M4 6h16M4 12h16M4 18h10');
const studio=action('studio','Studio tools','M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z');
top.prepend(brand);top.append(actions);
const close=document.createElement('button');close.type='button';close.className='studio-new-side-close';close.setAttribute('aria-label','Close recents');close.textContent='×';side.querySelector('.logo')?.append(close);
const backdrop=document.createElement('div');backdrop.className='studio-new-history-backdrop';document.body.append(backdrop);
const closeHistory=()=>{side.classList.remove('open');backdrop.classList.remove('open');recents.setAttribute('aria-expanded','false')};
const openHistory=()=>{side.classList.add('open');backdrop.classList.add('open');recents.setAttribute('aria-expanded','true');close.focus()};
recents.setAttribute('aria-expanded','false');recents.onclick=openHistory;close.onclick=closeHistory;backdrop.onclick=closeHistory;
fresh.onclick=()=>{if(typeof window.newChat==='function')window.newChat();closeHistory();document.querySelector('#prompt')?.focus()};
studio.onclick=()=>document.querySelector('.studio-utility [data-studio-panel="workspace"]')?.click();
side.addEventListener('click',event=>{if(event.target.closest('.hist-item'))setTimeout(closeHistory,0)});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&side.classList.contains('open'))closeHistory()});
welcome.querySelector('.eyebrow').textContent='Open-source AI · ready to work';
welcome.querySelector('h1').innerHTML='What are we <em>working on?</em>';
welcome.querySelector('p').textContent='Talk it through, hand the task to an agent, or bring in a swarm for the hard problems.';
const chipLabels=['Untangle a hard idea','Plan and build something','Put a swarm on a deep problem'];
welcome.querySelectorAll('.chip').forEach((chip,index)=>{const label=chip.querySelector('span');if(label&&chipLabels[index])label.textContent=chipLabels[index]});
const syncEmpty=()=>body.classList.toggle('studio-new-empty',!welcome.classList.contains('hidden'));
new MutationObserver(syncEmpty).observe(welcome,{attributes:true,attributeFilter:['class']});syncEmpty();
const prompt=document.querySelector('#prompt');
if(window.matchMedia('(max-width:760px)').matches){
  prompt?.removeAttribute('autofocus');
  if(document.activeElement===prompt)prompt.blur();
  fresh.querySelector('span').textContent='New';
  recents.querySelector('span').textContent='Chats';
  studio.querySelector('span').textContent='Tools';
  document.querySelectorAll('#reasoning option').forEach(option=>{option.textContent=option.textContent.replace('Reasoning: ','')});
}
const composer=document.querySelector('.composer');
composer?.addEventListener('focusin',()=>body.classList.add('studio-new-keyboard'));
composer?.addEventListener('focusout',()=>setTimeout(()=>{if(!composer.contains(document.activeElement))body.classList.remove('studio-new-keyboard')},0));
})();</script>`;

export function studioNewPage(): string {
  return appPage()
    .replace("<script>(function(){const original=agentModel;agentModel=()=>selectedModel?selectedModel():original()})();</script>", "")
    .replace(' placeholder="Ask anything…" autofocus', ' placeholder="Ask anything…"')
    .replace("<title>OSS Studio</title>", "<title>OSS Studio · New</title>")
    .replace("</head>", NEW_STUDIO_STYLE + "</head>")
    .replace("<body>", '<body class="studio-new">')
    .replace("</body></html>", NEW_STUDIO_SCRIPT + "</body></html>");
}
