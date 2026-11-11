"use strict";

const $ = (id) => document.getElementById(id);
const SAVE_KEY = "acorn-expedition-team-v1";
const TICK = 200;
const MAX_OFFLINE = 3 * 24 * 60 * 60 * 1000;
const LEAD = 1100;
const allies = {
  raccoon: {name:"단단이", animal:"너구리", role:"방어", hp:115, power:7, outfit:"blue", skill:"굳건한 수비"},
  fox: {name:"솔이", animal:"여우", role:"공격", hp:69, power:15, outfit:"red", skill:"연속 베기"},
  rabbit: {name:"모아", animal:"토끼", role:"회복", hp:60, power:5, outfit:"green", skill:"약초 바람"},
  owl: {name:"달초", animal:"올빼미", role:"정찰", hp:57, power:14, outfit:"blue", skill:"달빛 사격"},
  wolf: {name:"서리", animal:"늑대", role:"공격", hp:83, power:17, outfit:"blue", skill:"서리 송곳니"},
  bear: {name:"바위", animal:"곰", role:"방어", hp:148, power:6, outfit:"green", skill:"대지의 포효"}
};
const hunts = [
  {name:"반딧불 숲길", foe:"솔잎 나방", place:"trail", sprite:0, hp:102, hit:10, seconds:10, herbs:3, twigs:1, target:"앞줄"},
  {name:"밤송이 덤불", foe:"밤송이 딱정벌레", place:"camp", sprite:1, hp:148, hit:15, seconds:13, herbs:1, twigs:3, target:"앞줄"},
  {name:"달밤 둥지", foe:"달밤 올빼미", place:"ruin", sprite:2, hp:450, hit:19, seconds:19, herbs:5, twigs:5, target:"뒷줄 우선 · 뒷줄 전체", recruit:"올빼미 정찰병 달초"},
  {name:"이슬 고개", foe:"이슬방울 나방", place:"trail", sprite:0, hp:236, hit:22, seconds:12, herbs:5, twigs:2, target:"앞줄"},
  {name:"바람 고원", foe:"바람길 딱정벌레", place:"camp", sprite:1, hp:275, hit:23, seconds:13, herbs:2, twigs:6, target:"뒷줄 우선"},
  {name:"붉은 협곡", foe:"협곡 늑대", place:"canyon", sprite:3, hp:340, hit:28, seconds:14, herbs:3, twigs:4, target:"뒷줄 기습"},
  {name:"철갑 둥지", foe:"철갑 멧돼지", place:"canyon", sprite:4, hp:650, hit:32, seconds:22, herbs:6, twigs:6, target:"앞줄 전체 · 돌진",boss:true}
];
const facilities = {
  garden: {name:"약초밭", herbs:12, twigs:5},
  tower: {name:"감시초소", herbs:5, twigs:12},
  forge: {name:"대장간"},
  board: {name:"게시판"},
  quarters: {name:"숙소"}
};
const skillInfo={
  raccoon:"두 전투 차례 동안 받는 피해를 줄여요.",
  fox:"일반 공격과 별도로 적을 두 번 베어요.",
  rabbit:"체력이 낮은 부상 동료를 회복해요.",
  owl:"달빛 화살을 쏴요. 적이 큰 공격을 준비하면 피해가 늘어요.",
  wolf:"약해진 적을 먼저 물어뜯어요. 적 체력이 절반 이하면 피해가 늘어요.",
  bear:"포효로 자신과 앞줄 동료가 받는 피해를 두 차례 줄여요."
};
const cooldowns={raccoon:4300,fox:3900,rabbit:3200,owl:4600,wolf:4100,bear:5200};
const beats=[5,7,14,9,10,11,16];
const recruitCosts={
  wolf:{herbs:25,twigs:16,material:"fang",amount:3,hunt:4},
  bear:{herbs:16,twigs:25,material:"bark",amount:3,hunt:3}
};
const materialInfo={iron:["철광석","shield"],fang:["송곳니","sword"],bark:["단단한 껍질","twig"]};

function fresh(now) {
  return {
    lineup:["raccoon","fox","rabbit",null], owned:["raccoon","fox","rabbit"], xp:{raccoon:0,fox:0,rabbit:0},
    herbs:0, twigs:0, garden:0, tower:0, wins:[0,0,0,0,0], attempts:[0,0,0,0,0],
    hunt:0, previous:0, queued:null, since:now, reports:{}, last:{}, training:null, wounds:{}
  };
}
function load() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || fresh(Date.now()); }
  catch { return fresh(Date.now()); }
}
const state = load();
state.wounds ??= {};
state.cooldowns ??= {};
state.materials ??= {iron:0,fang:0,bark:0};
state.items ??= [];
state.nextItem ??= 1;
state.equipped ??= {};
state.recovery ??= {};
state.trainings ??= {};
state.quarters ??= 0;
while(state.wins.length<hunts.length) state.wins.push(0);
while(state.attempts.length<hunts.length) state.attempts.push(0);
let canSave = true;
let round = null;
let detail = "";
let selected = null;
let inspectedHunt = state.hunt;
let feedback = "";
let message = "정찰대 출발";
let gains = null;
let pointer = null;
let skipClickUntil = 0;
let edge = null;
let bookPage=0;
let recruitChoice="wolf";
let inventoryPage=0;
let forgePage=0;
let gearOwner="raccoon";
let equipType="weapon";

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  catch { canSave = false; }
}
function level(id) {
  return Math.min(8,1+Math.floor((state.xp[id]||0)/3));
}
function unlocked(index) {
  return [true,state.wins[0]>=6,state.wins[1]>=9,state.wins[2]>0,state.tower>0,state.wins[4]>=4,state.wins[5]>=4][index];
}
function lockedHint(index) {
  return [
    "", "반딧불 숲길 "+state.wins[0]+"/6회 성공", "밤송이 덤불 "+state.wins[1]+"/9회 성공",
    "달밤 올빼미 첫 돌파", "감시초소 강화","바람 고원 4회 성공","붉은 협곡 4회 성공"
  ][index];
}
function slotOpen(index) {
  return index!==3 || state.owned.includes("owl");
}
function plannedHunt() {
  return state.queued ?? state.hunt;
}

const turnStep=index=>(hunts[index].seconds*1000-LEAD)/beats[index];
const turnAt=(index,turn)=>LEAD+(turn-1)*turnStep(index);
function enemyGroup(index) {
  const hunt=hunts[index], boss=index===2||hunt.boss;
  const health=boss?[Math.round(hunt.hp*.72),Math.round(hunt.hp*.14)]:[Math.floor(hunt.hp/3),Math.floor(hunt.hp/3)];
  health.push(hunt.hp-health[0]-health[1]);
  return health.map((max,i)=>({max,hp:max,sprite:boss&&i>0?(index===2?0:3):hunt.sprite,boss:boss&&i===0}));
}
function gearStats(id) {
  const result={hp:0,power:0,defense:0};
  for(const type of ["weapon","armor"]) {
    const item=state.items.find(entry=>entry.uid===state.equipped[id]?.[type]);
    if(!item) continue;
    if(type==="weapon") result.power+=item.tier*2+item.plus*2;
    else { result.hp+=item.tier*7+item.plus*4; result.defense+=item.tier+Math.floor(item.plus/2); }
  }
  return result;
}
function simulate(index, lineup, herbsLevel, wounds=state.wounds, ready=state.cooldowns, ranks=lineup.map(id=>id?level(id):0), gear=lineup.map(id=>id?gearStats(id):null)) {
  const hunt=hunts[index];
  const team=lineup.map((id,i)=>id ? {id,max:allies[id].hp+(ranks[i]-1)*4+(gear[i]?.hp||0),hp:0,damage:0,received:0,healed:0,ready:ready[id]||0,guardUntil:0} : null);
  for(const member of team) if(member) member.hp=wounds[member.id]===-1?0:Math.max(1,member.max-(wounds[member.id]||0));
  const snapshots=[];
  const enemies=enemyGroup(index);
  let foe=hunt.hp, potions=1+herbsLevel;
  const living=(indices)=>indices.filter(i=>team[i]?.hp>0);
  const snapshot=(text,events=[],warning=null)=>snapshots.push({
    hp:team.map(m=>m?.hp||0), max:team.map(m=>m?.max||0), ready:team.map(m=>m?.ready||0),
    enemies:enemies.map(enemy=>enemy.hp), foe, text, events, warning, potions
  });
  const lowest=(indices)=>indices.reduce((a,b)=>team[a].hp<=team[b].hp?a:b);
  function owlMove(turn) {
    if(index===6&&enemies[0].hp>0&&[3,6,9,12].includes(turn)) {
      const front=living([0,1]),back=living([2,3]),row=front.length?front:back;
      return row.length?{bossName:hunt.foe,name:turn%2?"쇄암 돌진":"철갑 지진",damage:turn%2?58:42,row:front.length?"앞줄":"뒷줄",targets:row,wide:true}:null;
    }
    if(index!==2||enemies[0].hp<=0||![3,5,7,9].includes(turn)) return null;
    const back=living([2,3]), front=living([0,1]), row=back.length?back:front;
    if(!row.length) return null;
    const dive=turn===3||turn===7;
    return {bossName:hunt.foe,name:dive?"달밤 급강하":"월광 날개폭풍", damage:dive?83:54,
      row:back.length?"뒷줄":"앞줄",targets:dive?[lowest(row)]:row,wide:!dive};
  }
  let pending=null;
  snapshot("팀이 사냥터로 이동 중이에요.");
  for(let turn=1;turn<=14 && foe>0;turn++) {
    const live=living([0,1,2,3]);
    if(!live.length) break;
    const events=[];
    let text="동료들이 함께 공격해요.";
    const attack=pending;
    const time=turnAt(index,turn);
    const deal=(i,amount,kind,skill=null,preferred=0)=>{
      const target=enemies[preferred]?.hp>0?preferred:enemies.findIndex(enemy=>enemy.hp>0);
      if(target<0) return;
      const enemy=enemies[target], damage=Math.min(enemy.hp,amount);
      enemy.hp-=damage;
      foe=enemies.reduce((sum,entry)=>sum+entry.hp,0);
      team[i].damage+=damage;
      events.push({kind,from:i,enemy:target,value:damage,skill});
    };
    for(const i of live) {
      if(foe<=0) break;
      const member=team[i], id=member.id, trained=ranks[i]>=3;
      const injured=live.filter(slot=>team[slot].hp<team[slot].max);
      if(time<member.ready||id==="rabbit"&&!injured.length) continue;
      member.ready=time+cooldowns[id];
      if(id==="rabbit") {
        const target=lowest(injured), other=team[target];
        const amount=Math.min(other.max-other.hp,trained?19:12);
        other.hp+=amount;
        member.healed+=amount;
        events.push({kind:"heal",from:i,to:target,value:amount,skill:id});
      } else if(id==="raccoon"||id==="bear") {
        member.guardUntil=turn+1;
        if(id==="bear") for(const slot of living([0,1])) team[slot].guardUntil=turn+1;
        events.push({kind:"guard",from:i,to:i,skill:id});
      } else {
        const charging=index===2&&[2,4,6,8].includes(turn);
        const amount=id==="fox"?(trained?12:7):charging?(trained?20:13):(trained?9:6);
        if(id==="wolf") {
          const weak=enemies.reduce((best,enemy,j)=>enemy.hp>0&&(best<0||enemy.hp<enemies[best].hp)?j:best,-1);
          if(weak>=0) deal(i,(trained?16:10)+(enemies[weak].hp<=enemies[weak].max/2?7:0),"special",id,weak);
        } else if(id==="fox") {
          deal(i,Math.ceil(amount/2),"special",id);
          deal(i,Math.floor(amount/2),"special",id);
        } else deal(i,amount,"special",id);
      }
    }
    for(const i of live) {
      if(foe<=0) break;
      deal(i,allies[team[i].id].power+Math.floor((ranks[i]-1)*.8)+(gear[i]?.power||0),"attack",null,i%enemies.length);
    }
    if(foe>0) {
      for(let enemy=0;enemy<enemies.length;enemy++) {
        if(enemies[enemy].hp<=0) continue;
        const liveFront=living([0,1]),liveBack=living([2,3]);
        if(!liveFront.length&&!liveBack.length) break;
        const technique=enemies[enemy].boss?attack:null;
        const announced=technique?.targets.filter(i=>team[i]?.hp>0);
        const targets=announced?.length?announced:[((index===4||index===5)&&turn%3===0&&liveBack.length)?lowest(liveBack):(liveFront[0]??liveBack[0])];
        for(const i of targets) {
          const member=team[i];
          const share=index===2||hunt.boss?(enemy===0?.8:.1):1/3;
          const raw=technique?.damage??Math.max(1,Math.round(hunt.hit*share));
          const guarded=turn<=member.guardUntil;
          const trained=ranks[i]>=3;
          const guard=guarded?(trained?.53:.60):(member.id==="raccoon"||member.id==="bear")?(trained?.62:.70):1;
          const hit=Math.min(member.hp,Math.max(1,Math.round(raw*guard)-(gear[i]?.defense||0)));
          member.hp-=hit;
          member.received+=hit;
          events.push({kind:"hit",to:i,enemy,value:hit});
        }
      }
      if(attack) text=`${attack.name} · ${attack.row} 피격`;
      const survivors=living([0,1,2,3]);
      if(potions&&survivors.length) {
        const i=lowest(survivors), member=team[i];
        if(member.hp<=member.max*.38) {
          const amount=Math.min(member.max-member.hp,18+herbsLevel*13);
          member.hp+=amount;
          member.healed+=amount;
          potions--;
          events.push({kind:"potion",to:i,value:amount});
        }
      }
    }
    pending=foe>0?owlMove(turn+1):null;
    snapshot(text,events,pending);
  }
  const won=foe===0;
  const health=team.reduce((sum,m)=>sum+(m?.hp||0),0);
  const total=team.reduce((sum,m)=>sum+(m?.max||0),0);
  const survivors=team.filter(m=>m?.hp>0).length;
  const score=Math.round(100*health/Math.max(1,total));
  const needsRest=!won;
  return {won,team,snapshots,score,survivors,needsRest};
}
const visitsCamp=(cycle)=>cycle.manual||cycle.result.needsRest;
const battleLength=(cycle)=>Math.max(LEAD,turnAt(cycle.index,cycle.result.snapshots.length-1))+550;
function recoveryPlan(cycle) {
  const start=cycle.start+battleLength(cycle), result={};
  for(const member of cycle.result.team.filter(Boolean)) {
    if(member.hp===member.max) continue;
    const knocked=member.hp<=0;
    const seconds=knocked?(cycle.quarters?12:18):(cycle.garden?3:6);
    result[member.id]={start,end:start+seconds*1000,knocked};
  }
  return result;
}
const duration=(cycle)=>battleLength(cycle)+(!cycle.manual&&cycle.result.needsRest?
  Math.max(0,...Object.values(recoveryPlan(cycle)).map(record=>record.end-record.start)):0);
function recoveryLeft(id,now=Date.now()) {
  const record=state.recovery[id]||((round&&battleView(now).camp)?recoveryPlan(round)[id]:null);
  return record?Math.max(0,Math.ceil((record.end-now)/1000)):0;
}
function recover(now) {
  let changed=false;
  for(const [id,record] of Object.entries(state.recovery)) {
    if(now<record.end) continue;
    delete state.recovery[id];
    delete state.wounds[id];
    changed=true;
  }
  return changed;
}
function survival(result) {
  return !result.won?"위험":result.score>=53?"안정":"주의";
}
function finish(cycle) {
  const index=cycle.index, hunt=hunts[index], result=cycle.result;
  const first=state.wins[index]===0;
  state.attempts[index]++;
  state.last[index]={won:result.won,score:result.score};
  const herbs=result.won?hunt.herbs:0, twigs=result.won?hunt.twigs:0;
  if(result.won) {
    state.wins[index]++;
    state.herbs+=herbs;
    state.twigs+=twigs;
    const material=index===3?"bark":index===4?"fang":index>=5?"iron":null;
    if(material) state.materials[material]+=index===6?3:1;
    if(state.wins[index]%3===0||first&&(index===2||index===6)) {
      state.items.push({uid:state.nextItem++,type:index%2?"armor":"weapon",tier:index>=5?3:index>=2?2:1,plus:0});
    }
  }
  const active=result.team.filter(Boolean);
  for(const id of Object.keys(state.cooldowns)) state.cooldowns[id]=Math.max(0,state.cooldowns[id]-duration(cycle));
  for(const member of active) state.cooldowns[member.id]=Math.max(0,member.ready-duration(cycle));
  for(const member of active) state.wounds[member.id]=member.hp>0?member.max-member.hp:-1;
  if(visitsCamp(cycle)) {
    Object.assign(state.recovery,recoveryPlan(cycle));
    recover(cycle.start+duration(cycle));
  }
  const herbShare=active.map((_,i)=>Math.floor(herbs/active.length)+(i<herbs%active.length?1:0));
  const twigShare=active.map((_,i)=>Math.floor(twigs/active.length)+(i<twigs%active.length?1:0));
  active.forEach((member,i)=>{
    const id=member.id;
    if(result.won) state.xp[id]=(state.xp[id]||0)+1;
    const report=state.reports[id]||{damage:0,received:0,healed:0,herbs:0,twigs:0};
    report.damage+=member.damage;
    report.received+=member.received;
    report.healed+=member.healed;
    report.herbs+=herbShare[i];
    report.twigs+=twigShare[i];
    state.reports[id]=report;
  });
  if(result.won&&index===2&&first) {
    state.owned.push("owl");
    state.xp.owl=0;
    state.training=cycle.start+duration(cycle)+90000;
  }
  if(!result.won) state.hunt=state.previous;
  if(state.queued!==null) changeHunt(state.queued);
  state.queued=null;
  return {herbs,twigs,first};
}
function changeHunt(index) {
  if(index!==state.hunt) {
    state.previous=state.hunt;
    state.hunt=index;
  }
}
function newCycle(start, saved={}) {
  const {lineup=state.lineup,index=state.hunt,garden=state.garden,wounds=state.wounds,manual=false,
    ready=state.cooldowns,ranks=lineup.map(id=>id?level(id):0),gear=lineup.map(id=>id?gearStats(id):null),quarters=state.quarters}=saved;
  return {start,index,lineup:[...lineup],garden,wounds:{...wounds},manual,ready:{...ready},ranks,gear,quarters,
    result:simulate(index,lineup,garden,wounds,ready,ranks,gear)};
}
function snapshotRound() {
  if(!round) return null;
  const {lineup,index,garden,wounds,manual,ready,ranks,gear,quarters}=round;
  return {lineup,index,garden,wounds,manual,ready,ranks,gear,quarters};
}
function begin(start) {
  round=newCycle(start);
  state.since=start;
  state.active=snapshotRound();
  save();
}
function holdCamp(time) {
  state.held=true;
  state.since=time;
  state.active=null;
  round=null;
}
function settle(now) {
  if(state.held) {
    round=null;
    recover(now);
    save();
    message="야영지 대기 중 · 직접 출격";
    return;
  }
  if(now-state.since>MAX_OFFLINE&&!state.active?.manual) {
    state.since=now-MAX_OFFLINE;
    state.active=null;
  }
  if(now<state.since) state.since=now;
  let cycle=newCycle(state.since,state.active||{});
  let count=0, herbs=0, twigs=0;
  while(now-cycle.start>=duration(cycle)) {
    const reward=finish(cycle);
    count++;
    herbs+=reward.herbs;
    twigs+=reward.twigs;
    if(cycle.manual) {
      holdCamp(cycle.start+duration(cycle));
      recover(now);
      cycle=null;
      break;
    }
    cycle=newCycle(cycle.start+duration(cycle));
  }
  round=cycle;
  if(cycle) state.since=cycle.start;
  state.active=snapshotRound();
  if(count) {
    message=`방치 결과 · 사냥 ${count}회`;
    gains={herbs,twigs};
  }
  save();
}
function battleView(now=Date.now()) {
  if(!round) return {camp:true,combat:false};
  const {result,index,start}=round, elapsed=Math.max(0,now-start);
  const combat=elapsed<battleLength(round);
  const frame=Math.min(result.snapshots.length-1,Math.max(0,Math.floor((elapsed-LEAD)/turnStep(index))+1));
  const age=frame===0?elapsed:elapsed-turnAt(index,frame);
  const length=duration(round);
  return {combat,camp:!combat&&visitsCamp(round),elapsed,frame,age,data:result.snapshots[frame],
    rest:Math.max(0,Math.ceil((length-elapsed)/1000)),progress:Math.min(100,elapsed/length*100)};
}
function move(from,to) {
  if(from===to||to<0||to>3||!slotOpen(to)) return false;
  const roster=typeof from==="string";
  const id=roster?from:state.lineup[from];
  if(!id||!state.owned.includes(id)||roster&&state.lineup.includes(id)) return false;
  const wounds=!round||visitsCamp(round)?{}:state.wounds;
  const previous=simulate(plannedHunt(),state.lineup,state.garden,wounds);
  if(!roster) state.lineup[from]=state.lineup[to];
  state.lineup[to]=id;
  selected=null;
  const after=simulate(plannedHunt(),state.lineup,state.garden,wounds);
  const combat=battleView().combat;
  feedback=`<span>예상 생존력</span>${scoreChip(previous)}<span aria-hidden="true">→</span>${scoreChip(after)}<small>${combat?"다음 사냥":"반영 완료"}</small>`;
  if(!combat) message="새 배치로 다음 사냥을 준비하고 있어요.";
  save();
  render();
  return true;
}

const btn=(action,label,classes="",disabled=false)=>`<button type="button" class="button ${classes}" data-act="${action}" ${disabled?"disabled":""}>${label}</button>`;
const glyphs={
  bag:"M3 6h10v8H3z M6 6V3h4v3 M3 9h10m-5 0v2",
  camp:"M1 13L8 3l7 10z M6 13l2-4 2 4",
  feather:"M2 14L12 4 M4 12L5 6l6-4h3v4l-5 5z",
  shield:"M3 4l5-2 5 2v5l-5 5-5-5z M8 5v5", sword:"M12 2l2 2-7 7-2-2z M4 8l4 4m-2-2-4 4",
  heal:"M6 2h4v4h4v4h-4v4H6v-4H2V6h4z", scout:"M2 8l6-5 6 5-6 5z M8 6v4",
  garden:"M3 13L13 3 M7 9C2 9 2 4 3 3c3 0 6 2 4 6zm1-1c0-4 3-6 6-6 0 3-2 6-6 6z",
  tower:"M3 13l2-9h6l2 9M3 4h10M5 8h6M6 13h4m-3-9V2h5",
  twig:"M3 14l9-11M6 10l-2-5m4 3 5 1",
  lock:"M4 7h8v7H4z M6 7V4a2 2 0 0 1 4 0v3",
  target:"M8 1v3m0 8v3M1 8h3m8 0h3M8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
  clock:"M8 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M8 4v4l2 2",
  warning:"M8 2l7 12H1z M8 6v3m0 2v1",
  arrow:"M2 8h11m-4-4 4 4-4 4"
};
const roleIcons={raccoon:"shield",fox:"sword",rabbit:"heal",owl:"scout",wolf:"sword",bear:"shield"};
function icon(id) {
  return `<svg class="icon icon-${id}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="${glyphs[id]}"/></svg>`;
}
function scoreChip(result) {
  return `<span class="score ${result.won?"":"danger"}" aria-label="${survival(result)} ${result.score}%"><i style="--score:${result.score}%"></i>${result.score}%</span>`;
}
const resource=(id,value,label)=>`<span class="resource" aria-label="${label} ${value}" title="${label}">${icon(id)}<b>${value}</b></span>`;
function slot(id,index) {
  const ally=allies[id], key=index??id;
  const label=typeof index==="number" ? `${index<2?"앞줄":"뒷줄"} ${index%2+1}` : "대기 중";
  if(typeof index==="number"&&!slotOpen(index)) return `<button class="slot lock" disabled aria-label="첫 보스 격파 후 개방">${icon("lock")}<small>보스 격파</small></button>`;
  return `<button type="button" class="slot ${ally?"":"empty"}" data-slot="${key}" aria-pressed="${selected===key}" aria-label="${label} ${ally?`${ally.name} · ${ally.role} · 레벨 ${level(id)}`:"빈자리"}">
    ${ally?`<span class="badge ${id}" title="${ally.role}">${icon(roleIcons[id])}</span><span><b>${ally.name}</b><small>${recoveryLeft(id)?`회복 ${recoveryLeft(id)}초`:"LV "+level(id)}</small></span>`:"＋"}</button>`;
}
function camp() {
  const reserve=state.owned.filter(id=>!state.lineup.includes(id));
  const campAllies=state.owned.slice(bookPage*4,bookPage*4+4).map(id=>`<button class="camp-item ${id}" data-act="ally-${id}" aria-label="${allies[id].name} 활약">${icon(roleIcons[id])}<b>${allies[id].name}</b></button>`).join("");
  const buildings=Object.entries(facilities).map(([id,f])=>`<button class="camp-item facility ${state[id]?"improved":""}" data-act="${id}" aria-label="${f.name} 레벨 ${state[id]+1}">${facilityArt(id)}<b>${f.name}</b></button>`).join("");
  const next=state.wins[2] ? "" : state.hunt===0 ? `밤송이 덤불 발견 · ${Math.min(state.wins[0],6)}/6` :
    state.hunt===1 ? `달밤 둥지 발견 · ${Math.min(state.wins[1],9)}/9` : "";
  return `<div class="panel-title"><h2>팀 배치</h2><small>${next||"끌어서 이동 · 눌러 선택"}</small></div>
    <div class="formation">
      <div class="line"><span class="line-label">앞줄</span>${slot(state.lineup[0],0)}${slot(state.lineup[1],1)}</div>
      <div class="line"><span class="line-label">뒷줄</span>${slot(state.lineup[2],2)}${slot(state.lineup[3],3)}</div>
    </div><div class="roster">${reserve.map(id=>slot(id)).join("")}</div>
    <p class="feedback" role="status">${feedback}</p>
    <div class="camp-companions">${campAllies}${state.owned.length>4?btn("bookpage","다른 용병"):""}</div>
    <div class="camp-strip expanded" aria-label="야영지"><canvas id="camp-art" width="300" height="36" aria-hidden="true"></canvas>${buildings}</div>`;
}
const facilityArt=(id)=>`<canvas class="facility-art" data-facility="${id}" width="68" height="38" aria-hidden="true"></canvas>`;
function inventory() {
  const items=[
    ["garden","약초",state.herbs,"시설 강화 · 훈련"],
    ["twig","나뭇가지",state.twigs,"시설 강화"],
    ["feather","달밤 깃털",Number(state.wins[2]>0),"첫 보스 기념품"]
  ].filter(([id,,amount])=>id!=="feather"||amount);
  for(const [id,[name,glyph]] of Object.entries(materialInfo)) items.push([glyph,name,state.materials[id],"영입 · 제작"]);
  const cells=items.map(([id,label,amount,use])=>`<div class="item-cell">${icon(id)}<b>${amount}</b><span>${label}</span><small>${use}</small></div>`);
  cells.push(...state.items.map(item=>`<button class="item-cell" data-act="gear-${item.uid}">${icon(item.type==="weapon"?"sword":"shield")}<b>+${item.plus}</b><span>${gearName(item)}</span><small>${wearer(item.uid)||"미장착"}</small></button>`));
  inventoryPage=Math.min(inventoryPage,Math.max(0,Math.ceil(cells.length/6)-1));
  return panel("인벤토리",`<div class="inventory">${cells.slice(inventoryPage*6,inventoryPage*6+6).join("")}</div>${paging("inventorypage",inventoryPage,cells.length,6)}`);
}
function paging(action,page,count,size) {
  const pages=Math.ceil(count/size);
  return pages>1?`<div class="detail-grid">${btn(action+"-prev","‹ 이전","",page===0)}${btn(action+"-next",`다음 ${page+1}/${pages} ›`,"",page+1===pages)}</div>`:"";
}
function gearName(item) {
  return ["","숲길","강철","협곡"][item.tier]+" "+(item.type==="weapon"?"무기":"방어구");
}
function wearer(uid) {
  const id=state.owned.find(id=>Object.values(state.equipped[id]||{}).includes(uid));
  return id?allies[id].name:"";
}
function gearText(item) {
  return item.type==="weapon"?"공격 +"+(item.tier*2+item.plus*2):
    `체력 +${item.tier*7+item.plus*4} · 방어 +${item.tier+Math.floor(item.plus/2)}`;
}
function gearDetail(uid) {
  const item=state.items.find(item=>item.uid===uid);
  if(!item) return panel("장비",'<p class="info">장비가 없어요.</p>');
  return panel(gearName(item)+" +"+item.plus,`<div class="info">${gearText(item)} · ${wearer(uid)||"미장착"}</div>
    <div class="hunt-picker">${state.owned.map(id=>btn("owner-"+id,allies[id].name,gearOwner===id?"primary":"")).join("")}</div>
    <div class="detail-grid">${btn("equip-"+uid,allies[gearOwner].name+" 장착","primary")}${btn("unequip-"+uid,"장착 해제","",!wearer(uid))}</div>`);
}
function forgeMenu() {
  const tier=state.wins[5]>0?3:state.wins[2]>0?2:1;
  const item=state.items[forgePage];
  const cost=`약초 ${tier*6} · 가지 ${tier*8}${tier===3?" · 철광석 2":""}`;
  return panel("대장간",`<p class="muted">제작 · ${cost}</p>
    <div class="detail-grid">${btn("craft-weapon","무기 제작","primary")}${btn("craft-armor","방어구 제작","primary")}</div>
    ${item?`<div class="info">${gearName(item)} +${item.plus} · ${gearText(item)}<br>강화 성공 ${[100,80,60,45,30][item.plus]??0}% · 약초 4 / 가지 ${4+item.plus*2}<br><small>실패 시 한 단계 하락 · 재료 소모</small></div>
      ${btn("enhance-"+item.uid,"강화 시도","",item.plus>=5||state.herbs<4||state.twigs<4+item.plus*2)}${paging("forgepage",forgePage,state.items.length,1)}`:'<p class="info">사냥터에서 장비를 얻거나 제작하세요.</p>'}`);
}
function recruitMenu() {
  const c=recruitCosts[recruitChoice], a=allies[recruitChoice], joined=state.owned.includes(recruitChoice);
  const enough=state.herbs>=c.herbs&&state.twigs>=c.twigs&&state.materials[c.material]>=c.amount;
  return panel("용병 게시판",`<div class="detail-grid">${btn("candidate-wolf","늑대 · 서리",recruitChoice==="wolf"?"primary":"")}${btn("candidate-bear","곰 · 바위",recruitChoice==="bear"?"primary":"")}</div>
    <div class="info">${icon(roleIcons[recruitChoice])} ${a.name} · ${a.role} · ${a.skill}<br>${skillInfo[recruitChoice]}</div>
    <p class="muted">약초 ${state.herbs}/${c.herbs} · 가지 ${state.twigs}/${c.twigs} · ${materialInfo[c.material][0]} ${state.materials[c.material]}/${c.amount}<br>영입 재료 · ${hunts[c.hunt].name}</p>
    ${btn("recruit-"+recruitChoice,joined?"영입 완료":a.name+" 영입","primary",joined||!enough)}`);
}
function quartersMenu() {
  const trainee=state.owned.filter(id=>!state.lineup.includes(id));
  return panel("용병 숙소",`<p class="info">기절 회복 ${state.quarters?"12":"18"}초 · 대기 용병 훈련</p>
    <div class="detail-grid">${trainee.map(id=>btn("training-"+id,`${allies[id].name} · ${state.trainings[id]?"훈련 중":"따라잡기 훈련"}`,"",Boolean(state.trainings[id]))).join("")||'<p class="muted">전열의 용병을 대기 명단으로 교체하면 훈련할 수 있어요.</p>'}</div>
    <p class="muted">훈련 60초 · 약초 3개로 즉시 완료 가능</p>
    ${Object.keys(state.trainings).map(id=>btn("boost-"+id,allies[id].name+" 훈련 완료 · 약초 3","",state.herbs<3)).join("")}
    ${btn("quarters-up","숙소 확장 · 약초 15 / 가지 20","primary",state.quarters>0||state.herbs<15||state.twigs<20)}`);
}
function loadoutMenu() {
  const list=state.items.filter(item=>item.type===equipType);
  inventoryPage=Math.min(inventoryPage,Math.max(0,list.length-1));
  const item=list[inventoryPage];
  return panel(allies[gearOwner].name+" 장비",`<div class="detail-grid">${btn("type-weapon","무기",equipType==="weapon"?"primary":"")}${btn("type-armor","방어구",equipType==="armor"?"primary":"")}</div>
    ${item?`<div class="info">${gearName(item)} +${item.plus} · ${gearText(item)}<br>${wearer(item.uid)||"미장착"}</div>${btn("equip-"+item.uid,"장착","primary")}${paging("loadoutpage",inventoryPage,list.length,1)}`:'<div class="info">장비를 획득하거나 대장간에서 제작하세요.</div>'}`);
}
function finishTraining(id) {
  const target=Math.max(0,...state.lineup.filter(Boolean).map(id=>state.xp[id]||0));
  state.xp[id]=Math.max(state.xp[id]||0,Math.max(0,target-2));
  delete state.trainings[id];
}
function handleExpansion(action,verb,arg) {
  if(action==="bookpage") bookPage=bookPage?0:1;
  if(action==="huntpage") inspectedHunt=inspectedHunt<4?4:0;
  if(verb==="inventorypage") inventoryPage+=arg==="next"?1:-1;
  if(verb==="forgepage") forgePage=Math.max(0,Math.min(state.items.length-1,forgePage+(arg==="next"?1:-1)));
  if(verb==="loadoutpage") inventoryPage+=arg==="next"?1:-1;
  if(verb==="candidate"&&recruitCosts[arg]) recruitChoice=arg;
  if(verb==="owner"&&state.owned.includes(arg)) gearOwner=arg;
  if(verb==="loadout"&&state.owned.includes(arg)) {
    gearOwner=arg;inventoryPage=0;detail="loadout";
  }
  if(verb==="type"&&["weapon","armor"].includes(arg)) {equipType=arg;inventoryPage=0;}
  if(verb==="reserve"&&state.lineup.filter(Boolean).length>1) {
    const index=state.lineup.indexOf(arg);
    if(index>=0) state.lineup[index]=null;
  }
  if(verb==="equip") {
    const item=state.items.find(item=>item.uid===Number(arg));
    if(item) {
      for(const equipment of Object.values(state.equipped)) if(equipment[item.type]===item.uid) delete equipment[item.type];
      (state.equipped[gearOwner]??={})[item.type]=item.uid;
      message=allies[gearOwner].name+" · "+gearName(item)+" 장착 (다음 전투 적용)";
    }
  }
  if(verb==="unequip") {
    for(const equipment of Object.values(state.equipped)) for(const type of ["weapon","armor"]) if(equipment[type]===Number(arg)) delete equipment[type];
  }
  if(verb==="craft"&&["weapon","armor"].includes(arg)) {
    const tier=state.wins[5]>0?3:state.wins[2]>0?2:1;
    if(state.herbs>=tier*6&&state.twigs>=tier*8&&(tier<3||state.materials.iron>=2)) {
      state.herbs-=tier*6;state.twigs-=tier*8;if(tier===3)state.materials.iron-=2;
      const item={uid:state.nextItem++,type:arg,tier,plus:0};
      state.items.push(item);forgePage=state.items.length-1;message=gearName(item)+" 제작 완료";
    } else message="제작 재료가 부족해요.";
  }
  if(verb==="enhance") {
    const item=state.items.find(item=>item.uid===Number(arg));
    if(item&&item.plus<5&&state.herbs>=4&&state.twigs>=4+item.plus*2) {
      state.herbs-=4;state.twigs-=4+item.plus*2;
      const success=Math.random()*100<[100,80,60,45,30][item.plus];
      item.plus+=success?1:-1;
      message=gearName(item)+" 강화 "+(success?"성공":"실패")+" · +"+item.plus;
    }
  }
  if(verb==="recruit") {
    const c=recruitCosts[arg];
    if(c&&!state.owned.includes(arg)&&state.herbs>=c.herbs&&state.twigs>=c.twigs&&state.materials[c.material]>=c.amount) {
      state.herbs-=c.herbs;state.twigs-=c.twigs;state.materials[c.material]-=c.amount;
      state.owned.push(arg);state.xp[arg]=0;state.trainings[arg]=Date.now()+60000;
      message=allies[arg].name+" 영입 · 숙소에서 적응 훈련 중";
    }
  }
  if(verb==="training"&&state.owned.includes(arg)&&!state.lineup.includes(arg)&&!state.trainings[arg]) state.trainings[arg]=Date.now()+60000;
  if(verb==="boost"&&state.trainings[arg]&&state.herbs>=3) {state.herbs-=3;finishTraining(arg);}
  if(action==="quarters-up"&&!state.quarters&&state.herbs>=15&&state.twigs>=20) {
    state.herbs-=15;state.twigs-=20;state.quarters=1;message="숙소 확장 · 다음 귀환부터 기절 회복 12초";
  }
}
function panel(title,body) {
  return `<div class="detail"><div class="detail-head"><h2>${title}</h2>${btn("back","‹ 야영지로")}</div>${body}</div>`;
}
function allyDetail(id) {
  const a=allies[id], rank=level(id);
  const r=state.reports[id]||{damage:0,received:0,healed:0,herbs:0,twigs:0};
  const activity=a.role==="방어"?`공격 피해 ${r.received}을 받아냈어요.`:a.role==="회복"?`팀 체력을 ${r.healed} 회복했어요.`:`적에게 피해 ${r.damage}을 입혔어요.`;
  const training=id==="owl"&&state.training ? `<div class="info">야영지 적응 훈련 중 · 약 ${Math.max(0,Math.ceil((state.training-Date.now())/1000))}초${btn("train","약초 3개로 훈련 완료","",state.herbs<3)}</div>`:"";
  return panel(`${icon(roleIcons[id])} ${a.name} · Lv.${rank}`, `<p class="muted">${a.animal} · ${a.role} · ${a.skill} ${rank>=3?"강화":"(Lv.3 강화)"}</p>
    <div class="detail-grid"><div class="info">${activity}</div><div class="info">${resource("garden",r.herbs,"약초")} ${resource("twig",r.twigs,"나뭇가지")}</div></div><div class="info">${skillInfo[id]}${recoveryLeft(id)?" · 회복 "+recoveryLeft(id)+"초":""}</div>
    <div class="detail-grid">${btn("loadout-"+id,"장비 선택")}${btn("reserve-"+id,"대기로 이동","",!state.lineup.includes(id)||state.lineup.filter(Boolean).length<=1)}</div>${training}`);
}
function facilityDetail(id) {
  const f=facilities[id], done=Boolean(state[id]), allowed=Boolean(state.wins[2]);
  const cost=`${resource("garden",f.herbs,"약초")} ${resource("twig",f.twigs,"나뭇가지")}`;
  const description=id==="garden" ? (done?`회복약 2회 · 회복량 31 · 부상 3초 / 기절 ${state.quarters?12:18}초`:"회복약 1→2회 · 회복량 18→31 · 부상 6→3초 (기절은 숙소에서 단축)") :
    (done?"바람 고원의 새 사냥감을 발견했어요.":"강화하면 새 사냥터 바람 고원을 발견해요.");
  const upgrade=done?"":btn("upgrade-"+id,allowed?`강화 · ${cost}`:"첫 보스를 돌파하면 강화 가능","primary",!allowed||state.herbs<f.herbs||state.twigs<f.twigs);
  if(id==="garden") return panel(`${icon("garden")} 약초밭 · Lv.${state.garden+1}`,`<div class="facility-preview">${facilityArt(id)}<div class="info">${icon("heal")} ${description}</div></div>${upgrade}`);
  const hunt=hunts[inspectedHunt], last=state.last[inspectedHunt];
  const page=Math.floor(inspectedHunt/4);
  const picker=hunts.slice(page*4,page*4+4).map((h,j)=>{const i=page*4+j;return `<button class="choice" data-act="inspect-${i}" aria-pressed="${i===inspectedHunt}">${icon(unlocked(i)?"target":"lock")}${h.name}</button>`;}).join("");
  const drops=(inspectedHunt%2?"방어구":"무기")+" · "+(inspectedHunt===3?"단단한 껍질":inspectedHunt===4?"송곳니":inspectedHunt>=5?"철광석":"기본 재료");
  const info=`<div class="detail-grid"><div class="info"><b>${hunt.foe}</b><br>${icon("target")} ${hunt.target}</div><div class="info">${resource("garden",hunt.herbs,"약초")} ${resource("twig",hunt.twigs,"나뭇가지")}${hunt.recruit?`<br>${icon("scout")} ${hunt.recruit}`:""}</div></div>
    <div class="info">${drops}<br>지난 기록 · ${last?`${last.won?"성공":"실패"} · 생존력 ${last.score}%`:"기록 없음"}${unlocked(inspectedHunt)?"":" · "+lockedHint(inspectedHunt)}</div>`;
  const active=plannedHunt()===inspectedHunt;
  return panel(`${icon("tower")} 감시초소 · Lv.${state.tower+1}`,`<div class="facility-preview">${facilityArt(id)}<div class="hunt-picker">${picker}</div></div>${info}
    <div class="detail-grid">${btn("hunt-"+inspectedHunt,active?"선택된 사냥터":"이곳에서 사냥","primary",active||!unlocked(inspectedHunt))}${upgrade||btn("huntpage",page?"‹ 이전 지역":"다음 지역 ›")}</div>`);
}
function render() {
  $("stock").innerHTML=resource("garden",state.herbs,"약초")+resource("twig",state.twigs,"나뭇가지")+
    `<button class="icon-button" data-act="inventory" aria-label="인벤토리">${icon("bag")}</button>`;
  const notice=$("notice");
  notice.textContent=canSave?message:"브라우저 저장소를 사용할 수 없어요.";
  if(canSave&&gains) notice.insertAdjacentHTML("beforeend",`<span class="gains">${resource("garden","+"+gains.herbs,"약초")} ${resource("twig","+"+gains.twigs,"나뭇가지")}</span>`);
  $("panel").innerHTML=detail==="inventory"?inventory():detail==="forge"?forgeMenu():detail==="board"?recruitMenu():detail==="quarters"?quartersMenu():detail==="loadout"?loadoutMenu():
    detail.startsWith("gear-")?gearDetail(Number(detail.slice(5))):detail.startsWith("ally-")?allyDetail(detail.slice(5)):detail?facilityDetail(detail):camp();
  renderCombat();
}
let lastHud="";
function renderCombat() {
  const view=battleView(), hunt=hunts[round?.index??state.hunt];
  const {data}=view;
  const remaining=data?.enemies.filter(hp=>hp>0).length??0;
  const label=state.held?"야영지 대기":view.camp?"야영지 휴식":hunt.name+" · "+remaining+"/3";
  const phase=state.held?"출격 대기":view.camp?`${icon("clock")} ${view.rest}초`:`${icon("sword")} 자동`;
  const skills=view.combat&&view.age<660?[...new Map(data.events.filter(event=>event.skill).map(event=>[event.skill,event])).values()]:[];
  const remainingRecovery=Math.max(0,...state.lineup.filter(Boolean).map(id=>recoveryLeft(id)));
  const line=state.held?(remainingRecovery?`용병 회복 중 · ${remainingRecovery}초`:"회복 완료 · 출격을 기다리는 중"):
    view.camp?`기절·부상 회복 · ${view.rest}초 후 재출격`:data.text;
  const alert=`${skills.length?`<div class="skill-feed">${skills.map(event=>`<span class="${event.skill}">${icon(roleIcons[event.skill])} ${allies[event.skill].skill}</span>`).join("")}</div>`:""}${view.camp?`<div class="fight-message">${icon("clock")} ${line}</div>`:""}`;
  const warning=view.combat?data.warning:null;
  $("boss-warning").hidden=!warning;
  $("boss-warning").dataset.kind=round?.index===6?"boar":"owl";
  if(warning) {
    $("boss-name").textContent="위험 · "+warning.bossName;
    $("boss-skill").textContent=warning.name;
    $("boss-target").textContent=warning.row+(warning.wide?" 전체":" 집중 공격");
  }
  const layout=view.camp?[]:round.lineup;
  const meters=layout.map((id,i)=>id?`<div class="meter ${id}" style="grid-column:${i+1}" aria-label="${allies[id].name} 체력 ${data.hp[i]}/${data.max[i]}">${icon(roleIcons[id])}<i style="--hp:${100*data.hp[i]/data.max[i]}%"></i></div>`:"").join("");
  const enemyMeters=view.camp?"":enemyGroup(round.index).map((enemy,i)=>{
    const name=enemy.boss?hunt.foe:round.index===2?"호위 나방 "+i:
      (enemy.sprite===0?"나방 ":enemy.sprite===3?"늑대 ":"딱정벌레 ")+(i+1);
    const hp=data.enemies[i], defeated=hp<=0;
    return `<div class="meter enemy ${defeated?"defeated":""}" data-enemy="${i}" role="progressbar" aria-label="${name}${defeated?" 처치":""}" aria-valuemin="0" aria-valuemax="${enemy.max}" aria-valuenow="${hp}">
      <span class="enemy-name">${name}<small>${defeated?"처치":hp+"/"+enemy.max}</small></span>
      <i style="--hp:${100*hp/enemy.max}%"></i></div>`;
  }).join("");
  const hud=view.camp?"":`<div class="meters ally-meters" aria-label="동료 체력">${meters}</div><div class="meters enemy-meters" aria-label="몬스터별 체력">${enemyMeters}</div>`;
  if($("fight-alert").dataset.markup!==alert) {
    $("fight-alert").innerHTML=alert;
    $("fight-alert").dataset.markup=alert;
  }
  $("depart").hidden=!state.held;
  $("depart").disabled=remainingRecovery>0;
  $("depart").textContent=remainingRecovery?"회복 중 · "+remainingRecovery+"초":"출격";
  const retreat=$("retreat");
  retreat.disabled=!view.combat;
  retreat.hidden=view.camp;
  retreat.setAttribute("aria-pressed",String(Boolean(round?.manual)));
  retreat.setAttribute("aria-label",round?.manual?"귀환 예약 취소":"이번 전투 후 야영지 귀환");
  $("scene-label").textContent=label;
  if($("phase").dataset.phase!==phase) {
    $("phase").innerHTML=phase;
    $("phase").dataset.phase=phase;
  }
  $("phase").style.setProperty("--progress",(view.progress||0)+"%");
  if(hud!==lastHud) { $("health-bars").innerHTML=hud; lastHud=hud; }
}

function openDetail(next) {
  if(!detail) history.pushState({campDetail:true},"");
  detail=next;
  if(next==="tower") inspectedHunt=plannedHunt();
  render();
}
function closeDetail() {
  if(!detail) return;
  detail="";
  render();
  if(history.state?.campDetail) history.back();
}
window.addEventListener("popstate",()=>{
  detail="";
  render();
});
function chooseSlot(button) {
  const raw=button.dataset.slot;
  const to=/^\d$/.test(raw)?Number(raw):raw;
  if(selected!==null&&typeof to==="number"&&move(selected,to)) return;
  if(selected===to) selected=null;
  else if(typeof to==="string"||state.lineup[to]) selected=to;
  else return;
  feedback=selected===null?"":`${icon("arrow")} 목적지 선택`;
  render();
  $("panel").querySelector(`[data-slot="${raw}"]`)?.focus({preventScroll:true});
}
function completeTraining() {
  const floor=Math.min(...state.owned.filter(id=>id!=="owl").map(id=>state.xp[id]||0));
  state.xp.owl=Math.max(state.xp.owl||0,Math.max(0,floor-2));
  state.training=null;
  message="달초가 적응 훈련을 마쳤어요.";
}
document.addEventListener("click",(event)=>{
  const button=event.target.closest("button");
  if(!button) return;
  if(button.dataset.slot!==undefined) {
    if(performance.now()>=skipClickUntil) chooseSlot(button);
    return;
  }
  const action=button.dataset.act;
  if(!action) return;
  if(action==="back") { closeDetail(); return; }
  if(Object.hasOwn(facilities,action)||action==="inventory"||action.startsWith("ally-")||action.startsWith("gear-")) { openDetail(action); return; }
  if(action==="depart"&&state.held) {
    const now=Date.now();
    recover(now);
    if(state.lineup.some(id=>id&&recoveryLeft(id,now)>0)) return;
    for(const id of Object.keys(state.cooldowns)) state.cooldowns[id]=Math.max(0,state.cooldowns[id]-(now-state.since));
    state.held=false;
    message="출격 · "+hunts[state.hunt].name;
    gains=null;
    begin(now);
    render();
    return;
  }
  if(action==="retreat"&&battleView().combat) {
    round.manual=!round.manual;
    state.active=snapshotRound();
    message=round.manual?"이번 전투 후 야영지 귀환":"귀환 예약 취소";
    gains=null;
    save();
    render();
    return;
  }
  const [verb,arg]=action.split("-");
  handleExpansion(action,verb,arg);
  if(verb==="hunt"||verb==="upgrade"||action==="train") gains=null;
  if(verb==="inspect") inspectedHunt=Number(arg);
  if(verb==="hunt"&&unlocked(Number(arg))) {
    const next=Number(arg);
    if(state.held) {
      changeHunt(next);
      message=`출격 대상 · ${hunts[next].name}`;
    } else if(battleView().combat) {
      state.queued=next===state.hunt?null:next;
      message=state.queued===null?"현재 사냥터를 유지해요.":`다음 사냥터 · ${hunts[next].name}`;
    } else {
      state.queued=next;
      message=`다음 사냥터 · ${hunts[next].name}`;
    }
  }
  if(verb==="upgrade") {
    const f=facilities[arg];
    if(f&&state.wins[2]&&!state[arg]&&state.herbs>=f.herbs&&state.twigs>=f.twigs) {
      state.herbs-=f.herbs;
      state.twigs-=f.twigs;
      state[arg]=1;
      message=arg==="garden"?"약초밭이 넓어졌어요. 다음 사냥부터 새 회복약을 써요.":"감시초소에서 바람 고원을 발견했어요.";
    }
  }
  if(action==="train"&&state.training&&state.herbs>=3) {
    state.herbs-=3;
    completeTraining();
  }
  save();
  render();
});
function findDrop(x,y) {
  const cell=document.elementFromPoint(x,y)?.closest("[data-slot]");
  const raw=cell?.dataset.slot;
  return raw!==undefined&&/^\d$/.test(raw)?Number(raw):null;
}
document.addEventListener("pointerdown",(event)=>{
  if(!event.isPrimary||event.button!==0) return;
  const button=event.target.closest("[data-slot]");
  if(button) {
    const raw=button.dataset.slot, from=/^\d$/.test(raw)?Number(raw):raw;
    if(typeof from==="string"||state.lineup[from]) {
      pointer={id:event.pointerId,from,x:event.clientX,y:event.clientY,dragged:false};
      button.setPointerCapture(event.pointerId);
    }
  } else if(detail&&event.pointerType==="touch"&&event.clientX<=24) {
    edge={id:event.pointerId,x:event.clientX,y:event.clientY};
  }
});
document.addEventListener("pointermove",(event)=>{
  if(pointer?.id!==event.pointerId) return;
  if(Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>7) pointer.dragged=true;
  if(!pointer.dragged) return;
  const to=findDrop(event.clientX,event.clientY);
  for(const node of $("panel").querySelectorAll("[data-slot]")) node.classList.toggle("drop",to!==null&&node.dataset.slot===String(to));
});
document.addEventListener("pointerup",(event)=>{
  if(edge?.id===event.pointerId) {
    if(event.clientX-edge.x>=55&&Math.abs(event.clientY-edge.y)<45) closeDetail();
    edge=null;
  }
  if(pointer?.id!==event.pointerId) return;
  if(pointer.dragged) {
    const to=findDrop(event.clientX,event.clientY);
    skipClickUntil=performance.now()+300;
    if(to===null||!move(pointer.from,to)) {
      for(const node of $("panel").querySelectorAll(".drop")) node.classList.remove("drop");
    }
  }
  pointer=null;
});
document.addEventListener("pointercancel",()=>{
  pointer=null;
  edge=null;
  for(const node of $("panel").querySelectorAll(".drop")) node.classList.remove("drop");
});
let lastSecond=0;
function tick() {
  if(document.hidden) return;
  const now=Date.now();
  let changed=false;
  if(recover(now)) {save();changed=true;}
  for(const [id,end] of Object.entries(state.trainings)) if(now>=end) {finishTraining(id);save();changed=true;}
  if(round&&now-round.start>=duration(round)) {
    const cycle=round;
    const {first,herbs,twigs}=finish(cycle);
    gains=cycle.result.won?{herbs,twigs}:null;
    if(cycle.result.won) {
      message=first&&cycle.index===2?"첫 보스 격파 · 네 번째 자리와 올빼미 정찰병 달초가 열렸어요!":
        cycle.index===0&&state.wins[0]===6?"밤송이 덤불 발견 · 감시초소에서 다음 사냥터를 골라요.":
        cycle.index===1&&state.wins[1]===9?"달밤 둥지 발견 · 뒷줄을 노리는 첫 보스에 도전할 수 있어요.":
        first&&cycle.index>=3?"새 사냥터 첫 돌파 · 배치와 시설의 효과를 확인했어요.":
        "사냥 성공";
    } else message="팀이 야영지에서 회복하고 이전 사냥터로 돌아갔어요.";
    feedback="";
    if(cycle.manual) {
      holdCamp(cycle.start+duration(cycle));
      message="야영지 대기 중 · 직접 출격";
      save();
    } else begin(cycle.start+duration(cycle));
    changed=true;
  }
  if(state.training&&now>=state.training) { completeTraining(); save(); changed=true; }
  if(Math.floor(now/1000)!==lastSecond&&(state.held||battleView(now).camp||detail==="quarters")) {
    lastSecond=Math.floor(now/1000);
    if(!pointer) changed=true;
  }
  if(changed) render();
  else renderCombat();
}
if(history.state?.campDetail) history.replaceState(null,"");
$("retreat").innerHTML=icon("camp");
settle(Date.now());
render();
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden) { settle(Date.now()); tick(); render(); }
});
window.addEventListener("pageshow",(event)=>{
  if(event.persisted) { settle(Date.now()); tick(); render(); }
});
setInterval(tick,TICK);
