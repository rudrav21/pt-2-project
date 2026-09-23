/* LOCK IN TIMER UPGRADE // Smart Pomodoro + Stopwatch Rewards */
(function(){
  const KEY='pt2_lock_in_dashboard_v1';
  const PRESETS=[
    {id:'25-5',label:'25 / 5',focus:25*60,break:5*60},
    {id:'50-10',label:'50 / 10',focus:50*60,break:10*60},
    {id:'75-15',label:'75 / 15',focus:75*60,break:15*60},
    {id:'90-20',label:'90 / 20',focus:90*60,break:20*60}
  ];
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return{}}};
  const write=s=>localStorage.setItem(KEY,JSON.stringify(s));
  const ensure=s=>{
    s.timerUpgrade ||= {};
    s.timerUpgrade.smartPreset ||= '50-10';
    s.timerUpgrade.smartRunning ||= false;
    s.timerUpgrade.smartPhase ||= 'focus';
    s.timerUpgrade.smartEndAt ||= 0;
    s.timerUpgrade.stopwatchRunning ||= false;
    s.timerUpgrade.stopwatchStartedAt ||= 0;
    s.timerUpgrade.stopwatchRewards ||= {};
    s.timerUpgrade.stopwatchRuns ||= 0;
    s.timerUpgrade.stopwatchMinutes ||= 0;
    s.timerUpgrade.smartCompletions ||= 0;
    return s;
  };
  const toast=t=>{try{window.showToast?.(t)}catch{}};
  const save=s=>{write(s);try{window.LOCKIN_LIVE_SHARE?.publish?.()}catch{}};
  const rewardStopwatch=(s,seconds)=>{
    const mins=Math.floor(seconds/60); if(mins<5)return null;
    const runId=`sw-${s.timerUpgrade.stopwatchStartedAt}-${seconds}`;
    if(s.timerUpgrade.stopwatchRewards[runId])return null;
    const blocks=Math.floor(mins/25),xp=blocks*20,coins=blocks*5;
    if(!blocks)return null;
    s.timerUpgrade.stopwatchRewards[runId]={seconds,xp,coins,at:Date.now()};
    s.timerUpgrade.stopwatchRuns++;
    s.timerUpgrade.stopwatchMinutes+=mins;
    return {xp,coins,mins};
  };
  let interval=null;
  function fmt(sec){sec=Math.max(0,Math.floor(sec));const m=Math.floor(sec/60),s=sec%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
  function injectStyles(){
    if(document.getElementById('lockinTimerUpgradeStyles'))return;
    const style=document.createElement('style');style.id='lockinTimerUpgradeStyles';style.textContent=`
      .smartTimerUpgrade{margin-top:14px;padding:13px;border:1px solid var(--line);border-radius:12px;background:linear-gradient(135deg,var(--soft),rgba(255,255,255,.012));box-shadow:0 12px 30px rgba(0,0,0,.18);animation:lockinTimerIn .35s var(--ui-ease,cubic-bezier(.2,.8,.2,1)) both}
      @keyframes lockinTimerIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
      .smartTimerHead{display:flex;align-items:center;justify-content:space-between;gap:10px}.smartTimerHead strong{display:block;margin-top:3px;color:var(--orange2);font:800 18px "Space Grotesk",sans-serif}.smartTimerBadge{border:1px solid var(--line);border-radius:999px;padding:4px 7px;color:var(--orange);font:800 7px "DM Mono",monospace;letter-spacing:.1em}
      .smartTimerPresets{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}.smartPresetBtn{min-width:0;padding:7px 4px!important;font-size:8px!important}.smartPresetBtn.active{background:var(--soft);border-color:var(--orange);color:var(--orange2);box-shadow:0 0 13px var(--soft)}
      .smartTimerDisplay{text-align:center;margin-top:12px;color:var(--text);font:700 38px/1 "Space Grotesk",sans-serif;letter-spacing:-.06em;font-variant-numeric:tabular-nums;text-shadow:0 0 20px var(--soft)}.smartTimerPhase{text-align:center;margin-top:4px;color:var(--muted);font:800 7px "DM Mono",monospace;letter-spacing:.18em}.smartTimerActions{display:flex;justify-content:center;gap:7px;margin-top:9px}.smartTimerActions .btn{min-width:92px}
      .smartStopwatch{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:13px;padding:10px;border:1px solid var(--line);border-radius:9px;background:rgba(255,255,255,.015)}.smartStopwatch span{display:block;color:var(--muted);font:800 7px "DM Mono",monospace;letter-spacing:.12em}.smartStopwatch strong{display:block;margin-top:3px;color:var(--orange2);font:800 18px "Space Grotesk",sans-serif;font-variant-numeric:tabular-nums}.smartStopwatchActions{display:flex;gap:6px}.smartStopwatchActions .btn{font-size:8px;padding:7px 8px}.smartTimerHint{margin-top:9px;color:var(--muted);font:700 7px/1.45 "DM Mono",monospace;letter-spacing:.03em}.smartStopwatchStats{margin-top:6px;color:var(--orange);font:800 7px "DM Mono",monospace;letter-spacing:.08em}
      .smartTimerUpgrade:has(.smartPresetBtn.active) .smartTimerDisplay{animation:lockinTimerGlow 2.6s ease-in-out infinite}@keyframes lockinTimerGlow{50%{text-shadow:0 0 28px var(--soft);transform:scale(1.012)}}
      @media(max-width:600px){.smartTimerPresets{grid-template-columns:repeat(2,1fr)}.smartStopwatch{align-items:flex-start;flex-direction:column}.smartStopwatchActions{width:100%}.smartStopwatchActions .btn{flex:1}}
      @media(prefers-reduced-motion:reduce){.smartTimerUpgrade,.smartTimerUpgrade .smartTimerDisplay{animation:none!important}}
    `;document.head.appendChild(style);
  }
  function ensureUI(){
    if(document.getElementById('smartPomodoroPanel'))return;
    const timerSide=document.querySelector('.timerSide'); if(!timerSide)return;
    const panel=document.createElement('div');panel.id='smartPomodoroPanel';panel.className='smartTimerUpgrade';
    panel.innerHTML=`<div class="smartTimerHead"><div><span class="label">SMART TIMER</span><strong id="smartTimerTitle">50 / 10</strong></div><span class="smartTimerBadge">SMART MODE</span></div><div class="smartTimerPresets" id="smartTimerPresets"></div><div class="smartTimerDisplay" id="smartTimerDisplay">50:00</div><div class="smartTimerPhase" id="smartTimerPhase">FOCUS</div><div class="smartTimerActions"><button class="btn main" id="smartTimerStart">START</button><button class="btn" id="smartTimerReset">RESET</button></div><div class="smartStopwatch"><div><span>STOPWATCH</span><strong id="smartStopwatchDisplay">00:00</strong></div><div class="smartStopwatchActions"><button class="btn" id="smartStopwatchStart">START</button><button class="btn" id="smartStopwatchReset">RESET</button></div></div><div class="smartTimerHint" id="smartTimerHint">50 min focus // 10 min break</div><div class="smartStopwatchStats" id="stopwatchRewardStats">0 REWARDED RUNS // 0 MIN</div></div>`;
    timerSide.appendChild(panel);
    const host=panel.querySelector('#smartTimerPresets');
    PRESETS.forEach(p=>{const b=document.createElement('button');b.className='btn smartPresetBtn';b.dataset.preset=p.id;b.textContent=p.label;b.onclick=()=>setPreset(p.id);host.appendChild(b)});
    panel.querySelector('#smartTimerStart').onclick=toggleSmart;
    panel.querySelector('#smartTimerReset').onclick=resetSmart;
    panel.querySelector('#smartStopwatchStart').onclick=toggleStopwatch;
    panel.querySelector('#smartStopwatchReset').onclick=resetStopwatch;
  }
  function preset(){const s=ensure(read());return PRESETS.find(p=>p.id===s.timerUpgrade.smartPreset)||PRESETS[1]}
  function setPreset(id){const s=ensure(read());if(!PRESETS.some(p=>p.id===id))return;s.timerUpgrade.smartPreset=id;s.timerUpgrade.smartRunning=false;s.timerUpgrade.smartPhase='focus';s.timerUpgrade.smartEndAt=0;save(s);render();toast(`SMART POMODORO // ${preset().label} READY`)}
  function toggleSmart(){const s=ensure(read());const p=preset();if(s.timerUpgrade.smartRunning){s.timerUpgrade.smartRunning=false;s.timerUpgrade.smartEndAt=0;save(s);render();return}s.timerUpgrade.smartRunning=true;s.timerUpgrade.smartEndAt=Date.now()+currentSmartSeconds(s,p)*1000;save(s);render();}
  function currentSmartSeconds(s,p){if(!s.timerUpgrade.smartRunning||!s.timerUpgrade.smartEndAt)return s.timerUpgrade.smartPhase==='break'?p.break:p.focus;return Math.max(0,Math.ceil((s.timerUpgrade.smartEndAt-Date.now())/1000))}
  function resetSmart(){const s=ensure(read());s.timerUpgrade.smartRunning=false;s.timerUpgrade.smartPhase='focus';s.timerUpgrade.smartEndAt=0;save(s);render()}
  function toggleStopwatch(){const s=ensure(read());if(s.timerUpgrade.stopwatchRunning){s.timerUpgrade.stopwatchRunning=false;const seconds=Math.max(0,Math.floor((Date.now()-s.timerUpgrade.stopwatchStartedAt)/1000));const reward=rewardStopwatch(s,seconds);s.timerUpgrade.stopwatchStartedAt=0;save(s);if(reward){if(typeof window.awardXp==='function')window.awardXp(reward.xp,'stopwatch',`STOPWATCH // ${reward.mins} MIN`);s.coins=(Number(s.coins)||0)+reward.coins;save(s);window.renderCoins?.();toast(`STOPWATCH COMPLETE // +${reward.xp} XP // +${reward.coins} COINS`)}else if(seconds>=60)toast('STOPWATCH STOPPED // COMPLETE 25+ MIN TO EARN THE FULL REWARD');render();return}s.timerUpgrade.stopwatchRunning=true;s.timerUpgrade.stopwatchStartedAt=Date.now();save(s);render()}
  function resetStopwatch(){const s=ensure(read());s.timerUpgrade.stopwatchRunning=false;s.timerUpgrade.stopwatchStartedAt=0;save(s);render()}
  function tick(){
    const s=ensure(read());let changed=false;
    if(s.timerUpgrade.smartRunning){
      const p=preset();if(Date.now()>=s.timerUpgrade.smartEndAt){
        const wasFocus=s.timerUpgrade.smartPhase==='focus';
        s.timerUpgrade.smartPhase=wasFocus?'break':'focus';
        s.timerUpgrade.smartEndAt=Date.now()+(wasFocus?p.break:p.focus)*1000;
        changed=true;
        if(wasFocus){s.timerUpgrade.smartCompletions++;if(typeof window.awardXp==='function')window.awardXp(100,'smart-pomodoro',`SMART ${p.label} FOCUS COMPLETE`);s.coins=(Number(s.coins)||0)+10;save(s);window.renderCoins?.();toast(`SMART FOCUS COMPLETE // +100 XP // +10 COINS // ${p.break/60} MIN BREAK`)}else toast(`BREAK COMPLETE // BACK TO ${p.focus/60} MIN FOCUS`);
      }
    }
    if(changed)save(s);render();
  }
  function render(){
    const panel=document.getElementById('smartPomodoroPanel');if(!panel)return;const s=ensure(read()),p=preset();
    const smartSec=s.timerUpgrade.smartRunning?currentSmartSeconds(s,p):(s.timerUpgrade.smartPhase==='break'?p.break:p.focus);
    const d=document.getElementById('smartTimerDisplay'),ph=document.getElementById('smartTimerPhase'),start=document.getElementById('smartTimerStart'),hint=document.getElementById('smartTimerHint'),stats=document.getElementById('stopwatchRewardStats'),sw=document.getElementById('smartStopwatchDisplay'),swb=document.getElementById('smartStopwatchStart'),title=document.getElementById('smartTimerTitle');
    if(d)d.textContent=fmt(smartSec);if(ph)ph.textContent=s.timerUpgrade.smartPhase.toUpperCase();if(start)start.textContent=s.timerUpgrade.smartRunning?'PAUSE':'START';if(title)title.textContent=p.label;if(hint)hint.textContent=`${p.focus/60} min focus // ${p.break/60} min break // completed focus = +100 XP +10 coins`;
    if(stats)stats.textContent=`${s.timerUpgrade.stopwatchRuns||0} REWARDED RUNS // ${s.timerUpgrade.stopwatchMinutes||0} MIN`;
    if(sw)sw.textContent=s.timerUpgrade.stopwatchRunning?fmt(Math.floor((Date.now()-s.timerUpgrade.stopwatchStartedAt)/1000)):'00:00';if(swb)swb.textContent=s.timerUpgrade.stopwatchRunning?'STOP & REWARD':'START';
    document.querySelectorAll('.smartPresetBtn').forEach(b=>b.classList.toggle('active',b.dataset.preset===p.id));
  }
  function install(){injectStyles();ensureUI();if(interval)return;interval=setInterval(tick,1000);render();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,350),{once:true});else setTimeout(install,350);
})();
