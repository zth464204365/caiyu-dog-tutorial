const $=id=>document.getElementById(id);
const KEY='caiyu-tutorial-v1';
let state={cursor:0,done:[],checked:{},viewed:[]},storageWorks=true;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&Array.isArray(saved.done)&&Array.isArray(saved.viewed)&&saved.checked&&typeof saved.checked==='object')state={...state,...saved};}catch{storageWorks=false;}
let data,chapters,steps,ready=false,playing=false,position=0,lastTick=0,inspect=false,pan=null;
let view={yaw:0,pitch:0,zoom:1};
const audio=new Audio();audio.preload='metadata';
const groups=[['准备与焊接',0,6],['接线与电路检查',6,12],['烧录与核心测试',12,14],['机械装配',14,20],['验收与排查',20,23]];
// Connections are copied from the fixed author's GPIO map and the verified film.
const wiring=[
 {chapter:6,title:'OLED 屏幕',rows:[['GND','GND','oled_0'],['VCC','3V3','oled_1'],['SCL','GPIO9','oled_2'],['SDA','GPIO8','oled_3']]},
 {chapter:7,title:'INMP441 麦克风',rows:[['WS','GPIO7','mic_3'],['SCK','GPIO6','mic_4'],['SD','GPIO5','mic_0'],['VDD','3V3','mic_1'],['GND','GND','mic_2']]},
 {chapter:8,title:'功放与扬声器',rows:[['DIN','GPIO2','amp_0'],['BCLK','GPIO3','amp_1'],['LRC','GPIO4','amp_2'],['喇叭正端','功放 OUT+','speaker_plus'],['喇叭负端','功放 OUT−','speaker_minus']]},
 {chapter:9,title:'触摸与灯带',rows:[['触摸 VCC','3V3','touch_power'],['触摸 OUT','2kΩ → GPIO0','touch_signal'],['灯带 DIN','GPIO0','led_signal'],['触摸 GND','GND','touch_ground'],['灯带 GND','GND','led_ground']]},
 {chapter:10,title:'四腿信号',rows:[['H1 · 左前','GPIO1','servo_0_0'],['H2 · 右前','GPIO10','servo_1_0'],['H3 · 左后','GPIO20','servo_2_0'],['H4 · 右后','GPIO21','servo_3_0']]}
];
const checks={
 intro:['已确认材料包是 ESP32-C3 版本','已分清三维教学演示与实物检查'],
 inventory:['主控、屏幕、麦克风和功放已核对','四只舵机与配套电源已清点'],
 pcb:['已看清主控面与模块面','已用实物丝印核对板卡修订'],
 solderprep:['USB、电池与舵机电源均断开','针脚方向、高度与对角固定已检查'],
 solder:['焊点冷却后再移动工件','已检查相邻焊盘无连锡、焊点无松动'],
 mount:['接口朝向与电容正负极已核对','两排针没有偏移或连锡'],
 oled:['已按丝印确认四针顺序','SDA 接 GPIO8，SCL 接 GPIO9'],
 microphone:['已核对 WS / SCK / SD 三根信号','拾音孔未被遮挡，L/R 按作者电路接地'],
 speaker:['扬声器接功放的两个输出端','没有把喇叭负端误接公共地'],
 touch:['触摸模块供电为 3.3V','2kΩ 电阻只在触摸信号支路'],
 servowires:['四腿位置与 H1–H4 标签对应','动力支路独立，主控与舵机共地'],
 meter:['断电检查锡桥与极性后才上电','电压档与通断档分开使用，读数以实测为准'],
 flash:['已确认芯片和固件为匹配的 C3 版本','已核对镜像类型与烧录偏移'],
 boot:['屏幕、触摸、拾音、播放已分别测试','语音配网与服务按实际固件提示完成'],
 shellparts:['已清支撑并完成空壳试合','已用实际打印机与喷嘴重新切片'],
 install:['屏幕发光区对准前窗','主板、喇叭、电池不互相挤压'],
 center:['舵机在作者指定姿态下停稳','安装摆臂前已断开动力'],
 oneleg:['舵机沿预留开口入槽，线未被夹住','先固定摆臂中心钉，再安装腿'],
 fourlegs:['左右镜像和四腿位置已逐个核对','小范围试动无顶壳、卡住或突然掉电'],
 close:['线束避开摆臂和固定柱，留有余量','四周接缝自然贴合后才固定'],
 verify:['显示、触摸、语音与四腿功能分别实测','校准保存后重启，确认仍然保留'],
 trouble:['每次只修改一个位置再复测','卡住或供电异常时已停止并断电'],
 outro:['每个实物检查项目都亲自确认','保留匹配板卡版本与固件资料']
};
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,4200);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageWorks=false;}}
function step(){return steps[state.cursor];}
function timeText(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}
function stop(){playing=false;audio.pause();paintPlayback();}
function resetView(){view={yaw:0,pitch:0,zoom:1};window.updateView?.(0,0,1);}
function render(){if(!ready)return;const s=step();window.renderFilmAt(s.absolute+Math.min(position,s.beat.duration-.001));$('scrubber').value=Math.round(position/s.beat.duration*1000);$('timeText').textContent=timeText(position)+' / '+timeText(s.beat.duration);}
function markViewed(){if(!state.viewed.includes(step().beat.id)){state.viewed.push(step().beat.id);save();}paintPlayback();}
function paintPlayback(){if(!steps)return;const viewed=state.viewed.includes(step().beat.id);$('playBtn').querySelector('span').textContent=playing?'暂停演示':position>=step().beat.duration-.05?'再次演示':position>.05?'继续演示':'演示本步';$('targetBtn').hidden=playing||inspect;$('targetBtn').querySelector('span').textContent=position>.05?'继续演示':'演示本步';$('nextBtn').disabled=!ready||!viewed;$('nextBtn').textContent=viewed?(state.cursor===steps.length-1?'完成教程':'确认并继续'):'看完后继续';$('prevBtn').disabled=state.cursor===0;$('replayBtn').disabled=!ready;$('playBtn').disabled=!ready;}
function paintProgress(){const count=state.done.length;$('progressText').textContent=count+' / '+steps.length;$('totalProgress').max=steps.length;$('totalProgress').value=count;}
function drawContents(query=''){
 const q=query.trim().toLowerCase();$('chapterList').replaceChildren();let count=0;
 for(const [title,from,to] of groups){const box=document.createElement('div');box.className='chapter-group';const h=document.createElement('h3');h.textContent=title;box.append(h);let matched=0;
  chapters.slice(from,to).forEach((s,k)=>{const index=from+k;if(q&&!JSON.stringify(s).toLowerCase().includes(q))return;matched++;count++;const b=document.createElement('button');b.className='chapter-item';b.dataset.chapter=index;b.setAttribute('aria-current',step().chapter===index?'step':'false');if(s.beats.every(x=>state.done.includes(x.id)))b.classList.add('completed');const n=document.createElement('span');n.className='num';n.textContent=s.beats.every(x=>state.done.includes(x.id))?'✓':s.id;const t=document.createElement('span');t.textContent=s.title;b.append(n,t);b.onclick=()=>{go(index*2);$('sidebar').classList.remove('open');$('contentsBtn').setAttribute('aria-expanded','false');};box.append(b);});
  if(matched)$('chapterList').append(box);
 }$('emptySearch').hidden=count>0;
}
function drawChecks(){const c=chapters[step().chapter],host=$('checkList');host.replaceChildren();(checks[c.kind]||[]).forEach((text,i)=>{const id=c.id+'-'+i,label=document.createElement('label');label.className='check-row';const input=document.createElement('input');input.type='checkbox';input.checked=state.checked[id]===true;input.onchange=()=>{state.checked[id]=input.checked;save();};label.append(input,document.createTextNode(text));host.append(label);});}
function drawQuiz(){const group=wiring.find(w=>w.chapter===step().chapter);$('quiz').replaceChildren();$('quiz').hidden=!group;if(!group)return;const row=group.rows[0],label=document.createElement('label');label.htmlFor='quizAnswer';label.textContent='接线练习：'+row[0]+' 应连接哪里？';const select=document.createElement('select');select.id='quizAnswer';const opts=['请选择','GPIO0','GPIO1','GPIO2','GPIO7','GPIO8','GPIO9','3V3','GND'];for(const x of opts){const o=document.createElement('option');o.value=x;o.textContent=x;select.append(o);}const b=document.createElement('button');b.textContent='核对答案';const result=document.createElement('p');result.setAttribute('role','status');b.onclick=()=>{result.textContent=select.value===row[1]?'连接关系正确。实物仍需按丝印核对。':'再看接线表：'+row[0]+' → '+row[1]+'。';};$('quiz').append(label,select,b,result);}
function drawWires(){const host=$('wiringList');host.replaceChildren();for(const g of wiring){const section=document.createElement('div');section.className='wire-group';const title=document.createElement('h3');title.textContent=g.title;section.append(title);for(const [from,to,key] of g.rows){const b=document.createElement('button');b.className='wire-row';b.dataset.wire=key;b.setAttribute('aria-pressed','false');const start=document.createElement('span');start.textContent=from;const end=document.createElement('b');end.textContent='→ '+to;b.append(start,end);b.onclick=()=>{go(g.chapter*2+1,false);window.activeWire=key;position=step().beat.duration*.93;render();window.refreshScene();host.querySelectorAll('.wire-row').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));toast(from+' → '+to+'；蓝色端点与完整线段可对照查看。');};section.append(b);}host.append(section);}}
function go(index,changeTab=true){
 stop();state.cursor=Math.max(0,Math.min(steps.length-1,index));position=0;window.activeWire=null;resetView();const s=step(),c=chapters[s.chapter];audio.src='assets/voice-paced/'+s.beat.id+'.mp3';audio.playbackRate=Number($('speedSelect').value);
 $('lessonTitle').textContent=c.title;$('lessonLead').textContent=c.lead;$('fullText').textContent=s.beat.text;$('stepCounter').textContent='步骤 '+(state.cursor+1)+' / '+steps.length;
 [0,1].forEach(i=>{const el=$(i?'beatTwo':'beatOne');el.textContent=(i+1)+' · '+c.beats[i].instruction;el.setAttribute('aria-pressed',String(s.beatIndex===i));});
 drawChecks();drawQuiz();drawContents($('chapterSearch').value);if(changeTab)setTab('operation');render();paintPlayback();paintProgress();save();history.replaceState(null,'','#step-'+(state.cursor+1));
}
function setTab(name){for(const x of ['operation','wiring','check']){$(x+'Tab').setAttribute('aria-selected',String(x===name));$(x+'Tab').tabIndex=x===name?0:-1;$(x+'Panel').hidden=x!==name;}}
async function play(){if(!ready)return;if(playing){stop();return;}if(position>=step().beat.duration-.05)position=0;if(inspect){inspect=false;$('inspectBtn').setAttribute('aria-pressed','false');$('viewport').classList.remove('inspect');$('viewHint').textContent='固定教学机位 · 点蓝色按钮开始，随时暂停';resetView();}window.activeWire=null;
 if($('voiceToggle').checked){try{audio.currentTime=Math.min(position,Number.isFinite(audio.duration)?Math.max(0,audio.duration-.01):position);audio.playbackRate=Number($('speedSelect').value);await audio.play();}catch{toast('配音暂时无法播放，继续无声演示。可重新勾选中文配音重试。');$('voiceToggle').checked=false;}}
 playing=true;lastTick=performance.now();paintPlayback();requestAnimationFrame(tick);
}
function tick(now){if(!playing)return;const dt=Math.min(.1,(now-lastTick)/1000);lastTick=now;position+=$('voiceToggle').checked&&!audio.paused?Math.max(0,audio.currentTime-position):dt*Number($('speedSelect').value);position=Math.min(position,step().beat.duration);
 if(position>=step().beat.duration-.02||($('voiceToggle').checked&&audio.ended)){position=step().beat.duration-.001;stop();markViewed();render();return;}render();requestAnimationFrame(tick);}
async function boot(){
 try{const res=await fetch('lesson-data.json');if(!res.ok)throw new Error('教程数据读取失败');data=await res.json();chapters=data.chapters;steps=chapters.flatMap((s,i)=>s.beats.map((b,j)=>({chapter:i,beatIndex:j,beat:b,absolute:s.start+b.start})));
  state.done=state.done.filter(id=>steps.some(s=>s.beat.id===id));state.viewed=state.viewed.filter(id=>steps.some(s=>s.beat.id===id));state.cursor=Number.isInteger(state.cursor)?Math.max(0,Math.min(steps.length-1,state.cursor)):0;
  const hash=location.hash.match(/^#step-(\d+)$/);if(hash)state.cursor=Math.max(0,Math.min(steps.length-1,Number(hash[1])-1));
  window.FILM_STORY=chapters;window.FILM_CAPTIONS=data.captions;window.FILM_DURATION=data.duration;
  await import('./engine.js');await window.__hf.buildReady.film;ready=true;$('loading').hidden=true;drawWires();go(state.cursor);window.LAB_READY=true;
  if(!storageWorks)toast('浏览器未允许保存记录，本次仍可学习；可在资料中导出进度。');
 }catch(e){$('loading').replaceChildren(document.createTextNode('三维工作台未能载入。请刷新重试；也可以先观看配套视频。'));const b=document.createElement('button');b.textContent='刷新重试';b.onclick=()=>location.reload();$('loading').append(b);console.error(e);}
}
new ResizeObserver(entries=>{for(const e of entries){const scale=e.contentRect.width/1330;$('stage').style.transform='scale('+scale+')';$('stage').style.setProperty('--stage-scale',scale);}}).observe($('viewport'));
$('playBtn').onclick=play;$('targetBtn').onclick=play;$('replayBtn').onclick=()=>{stop();position=0;render();play();};
$('prevBtn').onclick=()=>go(state.cursor-1);$('nextBtn').onclick=()=>{if(!state.viewed.includes(step().beat.id))return;if(!state.done.includes(step().beat.id))state.done.push(step().beat.id);save();if(state.cursor===steps.length-1){paintProgress();drawContents();toast('学习流程已完成。请在“检查”中逐项记录实物核对结果。');}else go(state.cursor+1);};
$('beatOne').onclick=()=>go(step().chapter*2);$('beatTwo').onclick=()=>go(step().chapter*2+1);
$('scrubber').oninput=()=>{if(!ready)return;stop();position=Number($('scrubber').value)/1000*step().beat.duration;render();if(position>=step().beat.duration*.9)markViewed();};
$('voiceToggle').onchange=()=>{stop();};$('speedSelect').onchange=()=>{audio.playbackRate=Number($('speedSelect').value);};
$('chapterSearch').oninput=()=>drawContents($('chapterSearch').value);
$('homeLink').onclick=e=>{e.preventDefault();if(ready)go(0);};
for(const x of ['operation','wiring','check'])$(x+'Tab').onclick=()=>setTab(x);
document.querySelector('.panel-tabs').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=['operation','wiring','check'];let n=tabs.findIndex(x=>$(x+'Tab').getAttribute('aria-selected')==='true');n=e.key==='Home'?0:e.key==='End'?2:(n+(e.key==='ArrowRight'?1:2))%3;setTab(tabs[n]);$(tabs[n]+'Tab').focus();};
$('contentsBtn').setAttribute('aria-expanded','false');$('contentsBtn').onclick=()=>{const open=$('sidebar').classList.toggle('open');$('contentsBtn').setAttribute('aria-expanded',String(open));if(open)$('chapterSearch').focus();};$('closeContents').onclick=()=>{$('sidebar').classList.remove('open');$('contentsBtn').setAttribute('aria-expanded','false');$('contentsBtn').focus();};
$('inspectBtn').onclick=()=>{if(!ready)return;stop();inspect=!inspect;$('inspectBtn').setAttribute('aria-pressed',String(inspect));$('viewport').classList.toggle('inspect',inspect);$('viewHint').textContent=inspect?'拖动旋转，滚轮放大；触屏单指旋转，下方按钮可放大':'固定教学机位 · 点蓝色按钮开始，随时暂停';if(!inspect)resetView();paintPlayback();};
$('resetViewBtn').onclick=()=>resetView();$('labelsBtn').onclick=()=>{const show=$('labelsBtn').getAttribute('aria-pressed')!=='true';$('labelsBtn').setAttribute('aria-pressed',String(show));$('leader-wrap').hidden=!show;};
$('workbench').addEventListener('pointerdown',e=>{if(!inspect)return;pan={x:e.clientX,y:e.clientY};$('workbench').setPointerCapture(e.pointerId);});
$('workbench').addEventListener('pointermove',e=>{if(!pan||!inspect)return;view.yaw-=(e.clientX-pan.x)*.008;view.pitch=Math.max(-1.2,Math.min(1.2,view.pitch+(e.clientY-pan.y)*.008));pan={x:e.clientX,y:e.clientY};window.updateView(view.yaw,view.pitch,view.zoom);});
for(const event of ['pointerup','pointercancel'])$('workbench').addEventListener(event,()=>pan=null);
$('workbench').addEventListener('click',e=>{if(inspect||!ready)return;const r=$('workbench').getBoundingClientRect();if(window.isTargetAt?.((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2))play();});
$('workbench').addEventListener('wheel',e=>{if(!inspect)return;e.preventDefault();view.zoom=Math.max(.65,Math.min(2.5,view.zoom*Math.exp(-e.deltaY*.001)));window.updateView(view.yaw,view.pitch,view.zoom);},{passive:false});
// Native buttons provide zoom without requiring a wheel or a two-finger gesture.
for(const [label,factor] of [['放大',1.2],['缩小',1/1.2]]){const b=document.createElement('button');b.textContent=label;b.className='zoom-button';b.onclick=()=>{view.zoom=Math.max(.65,Math.min(2.5,view.zoom*factor));window.updateView?.(view.yaw,view.pitch,view.zoom);};$('resetViewBtn').before(b);}
$('videoBtn').onclick=()=>{stop();$('videoDialog').showModal();const seek=()=>{$('video').currentTime=ready?chapters[step().chapter].start:0;};$('video').addEventListener('loadedmetadata',seek,{once:true});$('video').load();};
$('closeVideo').onclick=()=>$('videoDialog').close();$('videoDialog').onclose=()=>$('video').pause();
$('resourcesBtn').onclick=()=>{$('resourcesDialog').showModal();};$('closeResources').onclick=()=>$('resourcesDialog').close();
$('resetBtn').onclick=()=>$('resetDialog').showModal();$('cancelReset').onclick=()=>$('resetDialog').close();$('confirmReset').onclick=()=>{state={cursor:0,done:[],viewed:[],checked:{}};save();$('resetDialog').close();go(0);toast('已重新开始，原学习和检查记录已清除。');};
$('exportProgress').onclick=()=>{const out={tutorial:'菜鱼狗 C3 互动教程',exportedAt:new Date().toISOString(),learningSteps:state.done,manuallyChecked:state.checked,lastStep:state.cursor+1,note:'学习记录和用户手动勾选，不是实物验收证明。'};const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));link.download='菜鱼狗_学习与检查记录.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('sidebar').classList.remove('open');$('contentsBtn').setAttribute('aria-expanded','false');}if(e.code==='Space'&&ready&&!['BUTTON','INPUT','SELECT','TEXTAREA','A'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();play();}});
boot();
