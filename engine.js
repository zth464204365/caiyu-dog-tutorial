import * as THREE from 'three';
import {buildModels} from './models.js';

window.__hf=window.__hf||{};window.__hf.buildReady=window.__hf.buildReady||{};
window.__hf.buildReady.film=(async()=>{
 const M=await buildModels();const story=window.FILM_STORY;
 const canvas=document.getElementById('workbench');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
 renderer.setSize(1330,780,false);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#edf0f1');
 const cam=new THREE.OrthographicCamera(-90,90,52.8,-52.8,.1,1500);
 scene.add(new THREE.HemisphereLight(0xf3faff,0xb1b8b7,1.8));
 const key=new THREE.DirectionalLight(0xfff3df,2);key.position.set(-70,150,70);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-150,right:150,top:140,bottom:-140,near:1,far:450});key.shadow.bias=-.001;scene.add(key);
 const fill=new THREE.DirectionalLight(0xcbe7fa,1.1);fill.position.set(100,80,-120);scene.add(fill);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),new THREE.ShadowMaterial({opacity:.15}));ground.rotation.x=-Math.PI/2;ground.position.y=-.4;ground.receiveShadow=true;scene.add(ground);
 const deck=new THREE.Group();scene.add(deck);
 const actors=[M.pcb,M.oled,...M.servos,M.speaker,M.battery,M.ledstrip,M.tip,M.solder,M.joint,M.meter,...M.probes,M.usb,M.robot];actors.forEach(a=>deck.add(a));
 const ghostMat=new THREE.MeshBasicMaterial({color:0x168fc6,wireframe:true,transparent:true,opacity:.42,depthWrite:false});
 const previewServo=M.servos[0].clone(true),previewFace=M.face.clone(true);
 const previews=[previewServo,previewFace];previews.forEach(o=>{o.traverse(n=>{if(n.isMesh)n.material=ghostMat;});o.visible=false;deck.add(o);});
 const baseRobot=[M.body,M.belly,M.face,M.faceDisplay,...M.legs,...M.ears,...M.installedServos,M.tail,M.paw].map(o=>({o,p:o.position.clone(),q:o.quaternion.clone()}));
 const moduleBase=Object.values(M.parts).map(o=>({o,p:o.position.clone(),q:o.quaternion.clone()}));
 const wires=M.group('teaching_harness',deck);const wiring={};
 const points=M.group('pin_focus_markers',deck);
 const ringMat=new THREE.MeshBasicMaterial({color:0x087aaf,transparent:true,opacity:.9,depthTest:false});
 const focusRings=Array.from({length:12},()=>{let o=new THREE.Mesh(new THREE.TorusGeometry(1.5,.24,8,24),ringMat);o.rotation.x=-Math.PI/2;o.renderOrder=100;points.add(o);return o;});
 function wire(key,a,b,color,route=0){
  const mid1=[a[0]+(b[0]-a[0])*.28,Math.max(a[1],b[1])+8+route,a[2]+(b[2]-a[2])*.1];
  const mid2=[a[0]+(b[0]-a[0])*.7,Math.max(a[1],b[1])+8+route,b[2]];
  const o=M.line(key,[a,mid1,mid2,b],.38,color,wires);wiring[key]=o;return o;
 }
 // Wiring is deliberately a separate, named view: actual PCB pins, spatially spread modules.
 const op=[48,9,-13],mp=[45,8,15],ap=[43,8,12],tp=[43,8,-12],lp=[45,8,17];
 const p=(ref,net)=>M.padIndex[ref+':'+net].toArray();
 const screenConnections=[['GND','ground'],['VCC_3V3','orange'],['IO9','violet'],['IO8','blue']];
 screenConnections.forEach(([net,c],i)=>wire('oled_'+i,p('CN1',net),[op[0]-3.81+i*2.54,op[1],op[2]+15],c,i*.7));
 const micNets=['IO5','VCC_3V3','GND','IO7','IO6'];
 micNets.forEach((net,i)=>wire('mic_'+i,p('U3',net),[mp[0]-6+i*3,mp[1],mp[2]+7],['blue','orange','ground','violet','green'][i],i*.55));
 ['IO2','IO3','IO4','GND'].forEach((net,i)=>wire('amp_'+i,p('U3',net),[ap[0]-6+i*4,ap[1],ap[2]+9],['blue','green','violet','ground'][i],i*.7));
 wire('touch_signal_main',p('U3','IO0'),[22,17,-12],'violet',1);wire('touch_signal',[24,17,-12],[tp[0],tp[1],tp[2]],'violet',1);wire('touch_power',p('U3','VCC_3V3'),[tp[0]-5,tp[1],tp[2]],'orange',0);wire('touch_ground',p('U3','GND'),[tp[0]+5,tp[1],tp[2]],'ground',2);
 wire('led_signal',p('U3','IO0'),[lp[0]-12,lp[1],lp[2]],'blue',3);wire('led_ground',p('U3','GND'),[lp[0]-12,lp[1],lp[2]+2],'ground',4);wire('led_power',p('U1','VBAT_IN'),[lp[0]-12,lp[1],lp[2]-2],'red',5);
 wire('amp_power',p('U5','VBAT_IN'),[ap[0]+7,ap[1],ap[2]],'red',5);
 const resistor=M.group('touch_2k_resistor',wires);M.box('0805_2k_body',[2.1,.7,1.3],[23,17,-12],'black',resistor,.12);for(const x of [22.1,23.9])M.box('0805_terminal',[.4,.8,1.3],[x,17,-12],'silver',resistor,.06);
 for(let i=0;i<4;i++){
  const ref=['H1','H2','H3','H4'][i],sig=['L_F','R_F','L_B','R_B'][i],x=42+(i%2)*30,z=(i<2?-1:1)*23;
  [sig,'VBAT_IN','GND'].forEach((net,j)=>wire('servo_'+i+'_'+j,p(ref,net),[x-7+j*2,13,z+4],['orange','red','ground'][j],i+j*.6));
 }
 // Speaker outputs remain a differential pair, never a fake ground connection.
 wire('speaker_plus',[43,12,18],[65,8,-8],'red',2);wire('speaker_minus',[47,12,18],[70,8,-8],'ground',1);
 const meterLeads=M.group('meter_leads',deck);M.line('meter_negative',[[-62,8,29],[-50,1,35],[-42,1,9],[-20,5,9]],.55,'ground',meterLeads);M.line('meter_positive',[[-53,8,29],[-48,1,-3],[-35,1,-12],[3,6,-10]],.55,'red',meterLeads);
 const legMarks=['左前 LF','右前 RF','左后 LB','右后 RB'];
 const labelSvg=document.getElementById('leaders');const labelGroup=document.getElementById('object-labels');
 let labelSignature='',activeIndex=-1,detailSignature='';
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 const lerp=(a,b,t)=>a+(b-a)*smooth(t);
 const cameraOffset={yaw:0,pitch:0,zoom:1};
 function view(pos,target,width){
  const look=new THREE.Vector3(...target), offset=new THREE.Vector3(...pos).sub(look);
  const sph=new THREE.Spherical().setFromVector3(offset);sph.theta+=cameraOffset.yaw;sph.phi=Math.max(.15,Math.min(Math.PI-.15,sph.phi+cameraOffset.pitch));
  cam.position.copy(new THREE.Vector3().setFromSpherical(sph).add(look));cam.lookAt(look);width/=cameraOffset.zoom;
  cam.left=-width/2;cam.right=width/2;cam.top=width*780/1330/2;cam.bottom=-cam.top;cam.updateProjectionMatrix();
 }
 function label(text,point,x,y,color='#1b3c4c'){return{text,point:new THREE.Vector3(...point),x,y,color};}
 function showLabels(labels){
  const signature=labels.map(l=>l.text).join('|');
  if(signature!==labelSignature){labelSvg.innerHTML=labels.map((_,i)=>`<path id="lead-${i}" fill="none" stroke-width="2"/><circle id="anchor-${i}" r="5"/>`).join('');labelGroup.innerHTML=labels.map((l,i)=>`<div class="object-label" id="label-${i}">${l.text}</div>`).join('');labelSignature=signature;}
  labels.forEach((l,i)=>{const pp=l.point.clone().project(cam);const x=(pp.x+1)*665,y=(1-pp.y)*390;const line=document.getElementById('lead-'+i);line.setAttribute('d',`M ${x} ${y} L ${l.x-14} ${l.y+20} L ${l.x+8} ${l.y+20}`);line.setAttribute('stroke',l.color);const c=document.getElementById('anchor-'+i);c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('fill',l.color);const el=document.getElementById('label-'+i);el.style.left=l.x+'px';el.style.top=l.y+'px';el.style.color=l.color;});
 }
 function reset(){
  previews.forEach(o=>o.visible=false);actors.forEach(a=>{a.visible=false;a.position.set(0,0,0);a.rotation.set(0,0,0);a.scale.setScalar(1);});deck.position.set(0,0,0);deck.rotation.set(0,0,0);
  moduleBase.forEach(({o,p,q})=>{o.visible=true;o.position.copy(p);o.quaternion.copy(q);});
  baseRobot.forEach(({o,p,q})=>{o.visible=true;o.position.copy(p);o.quaternion.copy(q);});
  ground.position.y=-.4;M.body.traverse(o=>{if(o.isMesh){o.material.opacity=1;o.material.transparent=false;o.material.depthWrite=true;}});
  M.servos.forEach(o=>{o.userData.horn.rotation.set(0,0,0);o.userData.horn.position.set(-5,17.3,0);const screw=o.userData.horn.getObjectByName('center_screw');screw.position.y=2.4;screw.rotation.set(0,0,0);});
  wires.visible=false;Object.values(wiring).forEach(o=>{o.visible=false;if(o.userData.localMaterial)o.material.opacity=1;});resistor.visible=false;meterLeads.visible=false;focusRings.forEach(o=>o.visible=false);points.visible=true;M.fillet.visible=true;
 }
 const DIAGRAM_KINDS=['oled','microphone','speaker','touch','servowires'];
 function revealWire(name,progress){const o=wiring[name];if(!o)return;o.visible=progress>0;o.geometry.setDrawRange(0,Math.floor(o.geometry.index.count*smooth(progress)/6)*6);}
 function marker(i,v,color=0x087aaf){if(!v)return;const r=focusRings[i];r.visible=true;r.position.copy(v);r.position.y+=.7;}
 function renderAt(time){
  const index=Math.max(0,story.findIndex(s=>time>=s.start&&time<s.start+s.duration));const s=story[index]||story.at(-1);const local=Math.max(0,time-s.start);let beatIndex=local>=s.beats[1].start?1:0;const b=s.beats[beatIndex],bt=Math.max(0,local-b.start),q=Math.min(1,bt/b.duration),a=smooth((q-.1)/.6);reset();let labels=[];
  const el=id=>document.getElementById(id);const rows=el('detail-rows');
  if(activeIndex!==index){el('chapter-number').textContent=s.id+' / '+story.length;activeIndex=index;}
  el('instruction').textContent=b.instruction;el('caution').textContent=b.note;el('action-count').textContent='动作 '+(beatIndex+1)+' / 2';
  document.getElementById('chapter-progress').style.transform=`scaleX(${Math.min(1,local/s.duration)})`;
  document.getElementById('mode-label').textContent=DIAGRAM_KINDS.includes(s.kind)?'引脚与网络教学视图':'三维操作演示';
  let detail=[];
  if(['intro','outro','verify','trouble','fourlegs','close'].includes(s.kind)){
   M.robot.visible=true;view([-150,125,155],[0,36,0],215);
   if(s.kind==='intro'){M.robot.rotation.y=lerp(-.14,.12,local/s.duration);labels=[label('屏幕 / 前方',[-55,35,0],95,490),label('尾巴 / 后方',[65,74,0],1020,150)];detail=['先认版本与零件','焊接和连接分开检查','裸机验证后再装壳','四腿逐个校准'];}
   if(s.kind==='outro'){detail=['1 认清版本','2 干装与焊接','3 分模块检查','4 校准与装配'];labels=[label('原始外壳：菜鱼的DIY',[0,57,0],80,110)];}
   if(s.kind==='fourlegs'){
    view([-150,145,165],[0,30,0],200);M.legs.forEach((leg,i)=>{leg.position.y+=beatIndex?Math.sin(Math.min(q,.8)*Math.PI*2)*1.3:0;});labels=legMarks.map((text,i)=>label(text,[...M.legs[i].position],i%2?1000:80,i<2?410:180));detail=['左前：GPIO1 / H1','右前：GPIO10 / H2','左后：GPIO20 / H3','右后：GPIO21 / H4'];
   }
   if(s.kind==='close'){
    const d=beatIndex===0?17:lerp(17,0,a);M.belly.position.y-=d;view([-150,-15,135],[0,29,0],178);labels=[label('先检查整圈接缝',[12,14,26],840,530),label('线束避开固定柱',[0,21,0],90,170)];detail=['线束留余量','避开腿的扫动范围','不挤压电池','自然贴合后固定'];
   }
   if(s.kind==='verify'){detail=['冷启动、重启分别测试','显示、触摸、语音分别验收','单腿到四腿逐项测试','保存校准，重启复测'];labels=[label('功能检查画面示意',[-55,36,0],70,450)];}
   if(s.kind==='trouble'){M.body.visible=beatIndex===1;detail=beatIndex?['动作重启：查供电、共地','卡住：查方向与间隙','先断电，再排查','一次只改一个地方']:['黑屏：电源与屏幕线路','无声：功放与扬声器','无拾音：麦克风与通道','再检查固件和板卡配置'];}
  }else if(s.kind==='inventory'){
   M.pcb.visible=M.oled.visible=M.speaker.visible=M.battery.visible=M.ledstrip.visible=true;
   M.pcb.position.set(-36,8,-14);M.oled.position.set(40,8,-28);M.speaker.position.set(44,8,22);M.battery.position.set(-32,9,35);M.ledstrip.position.set(38,8,52);
   M.servos.forEach((o,i)=>{o.visible=true;o.position.set(-70+i*26,16,72);o.scale.setScalar(.72);});view([-70,190,150],[0,8,15],208);
   labels=[label('主控 + 作者 PCB',[-35,10,-15],80,100),label('OLED 屏幕',[40,10,-27],980,95),label('扬声器',[45,12,22],1030,390),label('电池示意',[-33,15,35],90,480),label('四只舵机',[-26,20,72],570,640)];detail=['ESP32-C3 / SH1106','数字麦克风 / 数字功放','触摸 / 两段 WS2812','四只舵机 / 配套电源'];
  }else if(['pcb','solderprep','mount'].includes(s.kind)){
   M.pcb.visible=true;M.pcb.position.y=15;
   const flip=beatIndex===1?(s.kind==='pcb'?Math.PI:0):0;M.pcb.rotation.x=flip;
   view([-60,130,95],[0,15,0],112);
   if(s.kind==='pcb'){
    detail=beatIndex?['CN1：屏幕接口','U2：数字麦克风','U5：MAX98357A 功放','U6 / R1：触摸与2kΩ']:['U3：ESP32-C3 主控','H1 / H2：左前 / 右前','H3 / H4：左后 / 右后','电源接口按丝印核对'];
    labels=beatIndex?[label('OLED 接口 CN1',[-32,18,0],80,190),label('功放 U5',[12,18,-8],930,460),label('麦克风 U2',[-18,18,0],85,500)]:[label('主控 U3',[-17,20,0],80,190),label('四组舵机接口',[-16,19,14],770,570),label('电源与开关',[23,18,7],970,160)];
   }else if(s.kind==='solderprep'){
    Object.entries(M.parts).forEach(([key,o])=>{if(key==='U3')o.position.y+=lerp(22,0,a);else o.visible=key.startsWith('H');});
    labels=[label('两排针先对孔',[-18,21,0],90,140),label('先固定对角',[-15,17,10],850,530)];detail=['断开全部电源','先干装，不直接焊死','固定一角，再固定对角','检查垂直和高度'];
   }else{
    M.parts.U3.position.y+=beatIndex?0:lerp(22,0,a);labels=[label('USB 接口方向',[-17,25,-11],80,150),label('每个针脚独立焊点',[-8,18,0],920,500)];detail=['先低矮元件，再主控','USB朝外壳预留开口','两排针不能错位','电容与接口检查极性'];
   }
  }else if(s.kind==='solder'){
   M.joint.visible=M.tip.visible=M.solder.visible=true;M.joint.position.y=4;M.tip.position.set(-20+lerp(-12,0,a),16+lerp(15,0,a),0);M.solder.position.set(lerp(-12,0,a),4+lerp(8,0,a),0);
   if(beatIndex===0){M.fillet.scale.setScalar(Math.max(.06,smooth((q-.35)/.3)));}else{M.fillet.scale.setScalar(1);M.solder.position.x=-lerp(0,18,Math.min(q*2,1));M.tip.position.x=-20-lerp(0,16,Math.max(0,q*2-1));}
   view([-38,45,50],[0,5,0],70);labels=[label('针脚',[0,8,0],850,170),label('焊盘',[1.5,4,0],900,480),label(beatIndex?'冷却后检查焊点':'烙铁头触及交界',[0,4,0],75,350)];detail=beatIndex?['先撤焊锡','再撤烙铁','冷却前不晃动','检查锡桥和松动']:['焊盘 + 针脚同时受热','焊锡送到交界','形成润湿的坡面','温度与时间按工具、焊锡调整'];
  }else if(DIAGRAM_KINDS.includes(s.kind)){
   M.pcb.visible=true;M.pcb.position.y=10;view([-25,145,120],[12,8,0],160);wires.visible=true;
   // Move the PCB-space wire ends upward with the board, without changing the actual net positions.
   wires.position.y=10;const vp=(p0)=>[p0[0],p0[1]+10,p0[2]];
   const prog=beatIndex?1:smooth((q-.14)/.65);
   if(s.kind==='oled'){
    M.oled.visible=true;M.oled.position.set(...vp(op));screenConnections.forEach((_,i)=>revealWire('oled_'+i,Math.min(1,prog*4-i)));labels=[label('CN1：原 PCB 屏幕接口',[-32,12,0],60,130),label('四根线看名称',[48,24,2],850,140),label('发光区域',[48,23,-13],910,510)];detail=['GND → GND','VCC → 3V3','SCL → GPIO9','SDA → GPIO8'];
   }else if(s.kind==='microphone'){
    looseMic.visible=true;looseMic.scale.y=-1;looseMic.position.set(...vp(mp));micNets.forEach((_,i)=>revealWire('mic_'+i,Math.min(1,prog*5-i)));labels=[label('麦克风数据 SD',[45,23,20],920,480),label('拾音孔不遮挡',[45,24,15],860,160),label('主控输入引脚',[-17,20,0],65,230)];detail=['VDD → 3V3 / GND → GND','WS → GPIO7 / SCK → GPIO6','SD → GPIO5','L/R → GND（作者电路）'];
   }else if(s.kind==='speaker'){
    looseAmp.visible=true;looseAmp.scale.y=-1;looseAmp.position.set(...vp(ap));M.speaker.visible=true;M.speaker.position.set(69,18,-10);['amp_0','amp_1','amp_2','amp_3','amp_power'].forEach((name,i)=>revealWire(name,Math.min(1,prog*5-i)));if(beatIndex){revealWire('speaker_plus',1);revealWire('speaker_minus',1);}labels=[label('MAX98357A 功放',[43,24,12],900,480),label('扬声器两端是输出',[68,25,-10],870,120)];detail=['DIN → GPIO2','BCLK → GPIO3 / LRC → GPIO4','功放供电按 PCB 与模块确认','喇叭跨接输出，不能接地'];
   }else if(s.kind==='touch'){
    looseTouch.visible=true;looseTouch.scale.y=-1;looseTouch.position.set(...vp(tp));M.ledstrip.visible=true;M.ledstrip.position.set(...vp(lp));['touch_signal_main','touch_signal','touch_power','touch_ground'].forEach((name,i)=>revealWire(name,Math.min(1,prog*4-i)));resistor.visible=true;if(beatIndex){revealWire('led_signal',1);revealWire('led_ground',1);revealWire('led_power',1);}labels=[label('触摸供电 3.3V',[43,24,-12],830,120),label('R1：0805 / 2kΩ',[23,27,-12],430,80),label('灯带：电源、地、DIN',[40,21,17],860,550)];detail=['触摸 VCC → 3V3','触摸 OUT → R1 2kΩ → GPIO0','灯带 DIN → GPIO0','灯带 V、G、I 按丝印对应'];
   }else{
    M.servos.forEach((o,i)=>{o.visible=true;o.scale.setScalar(.67);o.position.set(42+(i%2)*30,15,(i<2?-1:1)*23);for(let j=0;j<3;j++)revealWire('servo_'+i+'_'+j,Math.min(1,prog*4-i));});labels=[label('H1：左前 / GPIO1',[-17,12,-14],65,90),label('H2：右前 / GPIO10',[-17,12,14],65,570),label('共地，动力分支独立',[59,13,0],870,160)];detail=['左前：GPIO1 / H1','右前：GPIO10 / H2','左后：GPIO20 / H3','右后：GPIO21 / H4'];
   }
  }else if(s.kind==='meter'){
   M.pcb.visible=M.meter.visible=true;M.pcb.position.set(10,12,0);M.meter.position.set(-51,7,15);meterLeads.visible=true;M.probes.forEach((o,i)=>{o.visible=true;o.position.set(i?0:-20,17,i?-10:9);o.rotation.z=i?-.45:.6;});view([-30,125,110],[0,9,0],150);labels=[label('黑表笔：公共地',[-20,12,9],75,540),label('红表笔：待测电源',[0,12,-10],920,140)];detail=beatIndex?['黑表笔固定接 GND','红表笔接待测电源轨','避免表笔同时碰相邻焊盘','读数按实际供电网络判断']:['USB、电池、舵机均断开','检查正负极与锡桥','检查相邻焊点','连通性与电压档分开使用'];
  }else if(s.kind==='flash'||s.kind==='boot'){
   M.pcb.visible=M.oled.visible=true;M.pcb.position.set(-16,14,0);M.oled.position.set(41,14,0);M.usb.visible=true;M.usb.position.set(-33,19,-lerp(40,16,a));view([-50,125,125],[0,12,0],150);labels=[label('数据线，不是纯充电线',[-33,19,-27],70,120),label('先只验证核心电路',[10,15,0],850,520)];detail=s.kind==='flash'?['芯片：ESP32-C3 / Flash：4MB','文件：Caiyu-Dog.bin','已核验合并镜像：起始 0x0','独立应用 BIN：另查偏移表']:['显示 → 触摸 → 拾音 → 播放','配网与绑定按固件提示','语音服务需要网络','这一段是检查流程示意'];
  }else if(s.kind==='shellparts'){
   M.robot.visible=true;M.body.position.y+=20;M.belly.position.y-=7;M.face.position.x-=25;M.faceDisplay.visible=false;M.legs.forEach((o,i)=>o.position.z+=(i%2?1:-1)*20);M.ears.forEach(o=>o.position.y+=15);view([-150,140,165],[0,35,0],230);labels=[label('身体',[0,77,0],80,140),label('脸框',[-78,34,0],80,490),label('肚子',[0,5,0],700,600),label('四条腿',[34,15,54],1050,430)];detail=['19个作者顶层打印对象','先去支撑与空壳试合','检查孔槽、卡位和方向','按实际打印机重新切片'];
  }else if(s.kind==='install'){
   M.robot.visible=true;M.body.visible=false;M.legs.forEach(o=>o.visible=false);M.ears.forEach(o=>o.visible=false);M.tail.visible=false;M.paw.visible=false;M.face.position.x-=beatIndex?0:lerp(24,0,a);M.faceDisplay.position.x-=beatIndex?0:lerp(12,0,a);M.pcb.visible=M.battery.visible=M.speaker.visible=true;M.pcb.position.set(10,35,0);M.battery.position.set(0,23,0);M.speaker.position.set(29,47,0);M.pcb.scale.setScalar(.9);view([-145,140,145],[0,35,0],180);labels=[label('屏幕对准前窗',[-54,34,0],70,480),label('先试合内部空间',[12,35,0],900,150),label('电池远离尖锐针脚',[0,23,0],870,540)];detail=['先对窗口，再固定','主控接口朝开口','拾音孔、喇叭开口留空','内部布局需结合实物确认'];
  }else if(s.kind==='center'){
   const servo=M.servos[0];servo.visible=true;servo.position.set(0,15,0);servo.userData.horn.position.y=beatIndex?17.3:lerp(33,17.3,a);servo.userData.horn.rotation.y=beatIndex?0:lerp(.7,0,a);view([-55,75,85],[0,20,0],105);labels=[label('先让转轴停稳',[-5,31,0],70,150),label('停稳后再装臂',[5,33,0],920,440)];detail=['先不装腿，逐只检查','作者在睡觉姿态下微调','确认姿态后断动力','示意角度不能当全部安装角'];
  }else if(s.kind==='oneleg'){
   M.robot.visible=true;M.faceDisplay.visible=false;M.face.visible=false;M.belly.visible=false;M.legs.forEach(o=>o.visible=false);M.ears.forEach(o=>o.visible=false);M.installedServos.forEach(o=>o.visible=false);M.tail.visible=false;M.paw.visible=false;
   M.body.traverse(o=>{if(o.isMesh){o.material.opacity=.28;o.material.transparent=true;o.material.depthWrite=false;}});
   const servo=M.servos[0];servo.visible=true;servo.rotation.x=Math.PI/2;servo.position.set(-29,beatIndex?23:lerp(-18,23,a),14);
   const leg=M.legs[1];leg.visible=beatIndex===1;leg.position.set(-34,9,beatIndex?lerp(58,34.3,smooth((q-.5)/.38)):58);
   if(beatIndex){servo.userData.horn.position.y=lerp(27,17.3,smooth(q/.3));const screw=servo.userData.horn.getObjectByName('center_screw');screw.position.y=lerp(8,2.4,smooth((q-.28)/.2));screw.rotation.y=lerp(0,Math.PI*6,smooth((q-.28)/.2));}
   view([-125,65,150],[-20,20,20],145);labels=[label('壳体透视：从下方入槽',[-29,23,14],75,130),label('摆臂固定后再装腿',[-34,23,40],870,510),label('先固定摆臂中心螺钉',[-34,23,31.3],870,140)];detail=beatIndex?['确认姿态后安装摆臂','先固定摆臂中心螺钉','腿粘好防滑垫，再装入','先试转，确认不蹭壳']:['舵机从壳体下方进入槽位','输出轴朝侧面预留开口','线从预留空间引出','不夹线、不强压'];
  }
  if(s.kind==='oneleg'&&beatIndex===0){previewServo.visible=true;previewServo.position.set(-29,23,14);previewServo.rotation.x=Math.PI/2;}
  if(s.kind==='install'&&beatIndex===0){previewFace.visible=true;previewFace.position.set(-54.5,34,0);}
  if(window.activeWire&&wiring[window.activeWire]){const path=wiring[window.activeWire].geometry.parameters.path;marker(0,path.getPoint(0).add(wires.position));marker(1,path.getPoint(1).add(wires.position));}
  if(M.robot.visible)ground.position.y=s.kind==='close'?-23:-12.4;
  const detailKey=s.id+'|'+detail.join('|');if(detailKey!==detailSignature){rows.innerHTML=detail.map((v,i)=>`<div class="detail-row"><span class="row-no">${i+1}</span><span>${v}</span></div>`).join('');detailSignature=detailKey;}
  const cap=(window.FILM_CAPTIONS||[]).find(c=>time>=c.start&&time<c.end);document.getElementById('subtitle').textContent=cap?cap.text:'';
  if(window.activeWire){Object.entries(wiring).forEach(([name,o])=>{if(o.visible){if(!o.userData.localMaterial){o.material=o.material.clone();o.userData.localMaterial=true;}o.material.transparent=true;o.material.opacity=name===window.activeWire?1:.12;}});}
  scene.updateMatrixWorld(true);cam.updateMatrixWorld(true);renderer.render(scene,cam);showLabels(labels);
 }
 const looseMic=M.parts.U2.clone(true);looseMic.name='loose_mic';looseMic.scale.y=-1;deck.add(looseMic);actors.push(looseMic);
 const looseAmp=M.parts.U5.clone(true);looseAmp.name='loose_amp';looseAmp.scale.y=-1;deck.add(looseAmp);actors.push(looseAmp);
 const looseTouch=M.parts.U6.clone(true);looseTouch.name='loose_touch';looseTouch.scale.y=-1;deck.add(looseTouch);actors.push(looseTouch);
 // Apply the source-side flip after the generic reset, in one wrapper.
 const coreRender=renderAt;let lastRenderedTime=-1;window.renderFilmAt=(time)=>{if(Math.abs(time-lastRenderedTime)<1e-8)return;lastRenderedTime=time;coreRender(time);};
 window.updateView=(yaw,pitch,zoom)=>{Object.assign(cameraOffset,{yaw,pitch,zoom});const t=lastRenderedTime;lastRenderedTime=-1;window.renderFilmAt(t);};
 window.refreshScene=()=>{const t=lastRenderedTime;lastRenderedTime=-1;window.renderFilmAt(t);};
 window.__models=M;window.__renderContext={scene,cam,renderer};window.renderFilmAt(0);
 const ray=new THREE.Raycaster();window.isTargetAt=(x,y)=>{ray.setFromCamera(new THREE.Vector2(x,y),cam);return previews.some(o=>o.visible&&ray.intersectObject(o,true).length>0);};
 return true;
})();
