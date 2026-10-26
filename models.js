import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';

export async function buildModels(){
 const mat={};
 for(const [key,color,metal,rough] of [['white',0xe7ecec,0,.38],['blue',0x36a9db,0,.36],['pcb',0x164e48,.15,.53],['black',0x192831,.12,.42],['silver',0xb5c4c7,.78,.3],['gold',0xd4a351,.72,.3],['red',0xca463e,0,.5],['ground',0x344550,0,.6],['orange',0xd49a37,0,.5],['violet',0x8856b4,0,.5],['green',0x479b62,0,.5],['glass',0x07191c,.4,.13]])mat[key]=new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough});
 mat.eye=new THREE.MeshStandardMaterial({color:0xb7f4ff,emissive:0x45cddd,emissiveIntensity:1.3,roughness:.25});
 const boxGeo=new THREE.BoxGeometry(1,1,1), cylGeo=new THREE.CylinderGeometry(1,1,1,20);
 function group(name,parent){let g=new THREE.Group();g.name=name;if(parent)parent.add(g);return g;}
 function box(name,d,p,m,parent,round=0){let mesh=new THREE.Mesh(round?new RoundedBoxGeometry(...d,2,round):boxGeo,mat[m]||m);if(!round)mesh.scale.set(...d);mesh.position.set(...p);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function cyl(name,r,h,p,m,parent){let mesh=new THREE.Mesh(cylGeo,mat[m]||m);mesh.scale.set(r,h,r);mesh.position.set(...p);mesh.name=name;mesh.castShadow=true;parent.add(mesh);return mesh;}
 function line(name,pts,r,m,parent){const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),Math.max(12,pts.length*6),r,8,false);const o=new THREE.Mesh(g,mat[m]||m);o.name=name;o.castShadow=true;parent.add(o);return o;}
 function plateText(text,w,h,parent,p=[0,0,0],color='#e8f2f4',bg=null){const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);const x=c.getContext('2d');if(bg){x.fillStyle=bg;x.fillRect(0,0,c.width,c.height);}x.fillStyle=color;x.font=`600 ${Math.floor(c.height*.67)}px "Microsoft YaHei", sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(text,c.width/2,c.height/2,c.width-14);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));o.position.set(...p);parent.add(o);return o;}
 const original=await (await fetch('assets/models/original-parts.json')).json();
 const originals={};
 await Promise.all(original.map(async obj=>{const g=group('original_'+obj.id);g.userData.authorName=obj.name;
  await Promise.all(obj.meshes.map(async m=>{const b=await (await fetch(m.path)).arrayBuffer();const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(b,0,m.vertices*3),3));geo.setIndex(new THREE.BufferAttribute(new Uint32Array(b,m.vertices*12,m.triangles*3),1));const smooth=toCreasedNormals(geo,Math.PI/5);const mesh=new THREE.Mesh(smooth,m.color===1?mat.white:m.color===3?mat.blue:mat.white);const a=m.transform;mesh.applyMatrix4(new THREE.Matrix4().set(a[0],a[3],a[6],a[9],a[1],a[4],a[7],a[10],a[2],a[5],a[8],a[11],0,0,0,1));mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);})); originals[obj.id]=g;
 }));
 const pcbData=await (await fetch('assets/models/pcb.json')).json();
 const pcb=group('author_PCB');
 const shape=new THREE.Shape();pcbData.outline.forEach((p,i)=>i?shape.lineTo(p[0],-p[1]):shape.moveTo(p[0],-p[1]));const pg=new THREE.ExtrudeGeometry(shape,{depth:1.6,bevelEnabled:false});pg.rotateX(-Math.PI/2);pg.translate(0,-.8,0);const pm=new THREE.Mesh(pg,mat.pcb);pm.name='PCB_outline_from_author';pm.receiveShadow=true;pcb.add(pm);
 for(const tr of pcbData.traces){const y=tr.layer===1?.85:-.85;line('trace_'+tr.net,[[tr.a[0],y,tr.a[1]],[tr.b[0],y,tr.b[1]]],Math.max(.06,tr.width*.32),'gold',pcb);}
 const parts={},padIndex={};
 for(const p of pcbData.parts){
  const g=group(p.designator,pcb);g.position.set(p.x,p.layer===1?1:-1,p.z);const side=p.layer===1?1:-1;g.userData.side=side;g.userData.base=[...g.position];g.userData.pins=p.pads;
  for(const v of p.pads){const x=v.x-p.x,z=v.z-p.z;const ring=new THREE.Mesh(new THREE.TorusGeometry(.83,.19,8,20),mat.gold);ring.rotation.x=Math.PI/2;ring.position.set(v.x,side*.9,v.z);pcb.add(ring);cyl('pin_'+v.num,.27,4.6,[x,0,z],'gold',g);padIndex[p.designator+':'+v.net]=new THREE.Vector3(v.x,side*1.5,v.z);}
  const center=p.pads.length?p.pads.reduce((a,b)=>[a[0]+b.x-p.x,a[1]+b.z-p.z],[0,0]).map(v=>v/p.pads.length):[0,0];
  if(p.designator==='U3'){
   box('ESP32_C3_SuperMini',[18,1.5,22.5],[center[0],side*3,center[1]],'pcb',g,.5);
   box('RF_shield',[10,1.4,10],[center[0],side*4.5,center[1]+2],'silver',g,.5);
   box('USB_C_shell',[8,3,5],[center[0],side*4,center[1]-10.7],'silver',g,.6);
   box('USB_C_socket',[6.3,1.1,.3],[center[0],side*4,center[1]-13.25],'black',g,.2);
   for(let i=0;i<5;i++)box('SMD_resistor',[.7,.55,1.3],[center[0]+5.5,side*4,center[1]-7+i*3],'black',g,.1);
   cyl('BOOT_button',1.3,1.2,[center[0]-5,side*4,center[1]-6],'black',g);cyl('RESET_button',1.3,1.2,[center[0]+5,side*4,center[1]-6],'black',g);
   const t=plateText('ESP32-C3',10,2,g,[center[0],side*5.3,center[1]+2],'#24333c');t.rotation.x=-side*Math.PI/2;
  }else if(p.designator==='U2'){
   box('INMP441_board',[16,1,12],[0,side*3,0],'pcb',g,.5);box('MEMS_microphone',[4.7,1.6,3.8],[0,side*4,0],'silver',g,.3);cyl('acoustic_port',.62,.15,[0,side*4.88,0],'black',g);
  }else if(p.designator==='U5'){
   box('MAX98357_board',[18,1,18],[0,side*3,0],'pcb',g,.5);box('amplifier_chip',[4.2,1,4.2],[0,side*4.1,0],'black',g,.1);box('speaker_terminal',[9,5,6],[-4,side*5,5],'green',g,.4);for(const x of [-6,-2])cyl('terminal_screw',1,1,[x,side*8,5],'silver',g);
  }else if(p.designator==='U6'){
   box('TTP223_board',[11,1,14],[0,side*3,0],'red',g,.5);cyl('touch_electrode',4.1,.2,[0,side*3.7,0],'gold',g);
  }else if(['C1','C2'].includes(p.designator)){
   const cap=cyl('electrolytic_capacitor',3.1,8,[0,5,0],'black',g);cyl('capacitor_top',2.8,.25,[0,9.1,0],'silver',g);box('polarity_stripe',[.3,5,1.9],[2.95,5.5,0],'white',g);
  }else if(p.designator==='R1'){
   box('0805_2k_resistor',[2.0,.6,1.25],[0,side*1,0],'black',g,.12);
   for(const x of [-.8,.8])box('resistor_terminal',[.45,.65,1.25],[x,side*1,0],'silver',g,.08);
  }else if(p.designator.startsWith('H')){
   box('servo_header',[3.1,2.1,8],[center[0],2,center[1]],'black',g,.3);
  }else if(['CN1','U1','U4','U8'].includes(p.designator)){
   box('connector_housing',[Math.max(4,p.pads.length*2.2),3.7,4.7],[center[0],side*2.8,center[1]],'white',g,.4);
  }else if(p.designator==='SW1'){
   box('slide_switch',[5,3,9],[0,side*3,0],'silver',g,.3);box('switch_lever',[3,3,4],[-2.9,side*3,0],'black',g,.3);
  }else if(p.designator==='U7'){
   box('power_module',[18,1.1,24],[0,side*3,0],'blue',g,.5);box('inductor',[6,3.5,6],[0,side*5,0],'black',g,.8);
  }
  parts[p.designator]=g;
 }
 function screen(){const g=group('SH1106_OLED');box('OLED_pcb',[35,1.4,33],[0,0,0],'pcb',g,.6);box('display_glass',[31,1.5,21],[0,1.4,0],'glass',g,.6);for(const x of [-14,14])for(const z of [-13.5,13.5])cyl('OLED_mounting_hole',1.4,.15,[x,.85,z],'gold',g);const face=group('eyes',g);for(const x of [-7,7])box('eye',[4.8,.3,10],[x,2.3,0],'eye',face,1.8);for(let i=0;i<4;i++)cyl('OLED_pin',.35,5,[-3.81+i*2.54,0,15],'gold',g);return g;}
 const oled=screen();
 function servo(name){const g=group(name);box('servo_case',[23,23,12],[0,0,0],'blue',g,1.3);box('mounting_ears',[32,2,12],[0,7.5,0],'blue',g,.7);cyl('motor_top',5.5,3,[-5,13,0],'blue',g);cyl('output_shaft',2.4,3,[-5,15.7,0],'gold',g);const horn=group('horn',g);horn.position.set(-5,17.3,0);cyl('hub',4,1.7,[0,0,0],'white',horn);box('servo_arm',[19,1.6,4],[5.7,0,0],'white',horn,1.5);for(let x=0;x<3;x++)cyl('arm_hole',.65,.13,[6+x*3,.9,0],'black',horn);const screw=cyl('center_screw',1.5,2,[0,2.4,0],'silver',horn);box('screw_slot',[2.3,.12,.4],[0,3.5,0],'black',horn);g.userData.horn=horn;return g;}
 const servos=Array.from({length:4},(_,i)=>servo('servo_'+['LF','RF','LB','RB'][i]));
 const speaker=group('speaker');cyl('speaker_shell',14,5,[0,0,0],'black',speaker);cyl('speaker_surround',12,1.4,[0,3.2,0],'silver',speaker);cyl('speaker_cone',10,1.1,[0,4,0],'black',speaker);cyl('speaker_dustcap',4,2,[0,4.6,0],'black',speaker);
 const battery=group('protected_battery');box('battery_pouch',[45,7.5,25],[0,0,0],'silver',battery,2);box('battery_end',[7,8,25],[20,0,0],'orange',battery,.9);const batteryLabel=plateText('BATTERY',32,6,battery,[0,3.9,0],'#213540','#cdd9dc');batteryLabel.rotation.x=-Math.PI/2;
 const ledstrip=group('WS2812_strip');box('flex_PCB',[24,.8,5],[0,0,0],'black',ledstrip,.3);for(const x of [-8,8]){box('LED_5050',[5,1,5],[x,.9,0],'white',ledstrip,.4);box('LED_die',[2.5,.3,2.5],[x,1.6,0],'eye',ledstrip,.3);}const lt=plateText('DIN → DOUT',25,4,ledstrip,[0,2.4,5.7],'#244654');lt.rotation.x=-Math.PI/2;
 const tip=group('soldering_iron');line('handle',[[-20,12,0],[0,0,0]],3,'black',tip);line('heater',[[0,0,0],[14,-8,0]],1.4,'silver',tip);line('tip',[[14,-8,0],[20,-12,0]],.65,'silver',tip);
 const solder=group('solder_wire');line('solder_wire',[[-15,8,0],[-10,5,0],[0,0,0]],.35,'silver',solder);
 const joint=group('solder_joint');box('PCB_macro',[22,1.7,18],[0,-1,0],'pcb',joint,.8);const pad=new THREE.Mesh(new THREE.TorusGeometry(2,.55,10,30),mat.gold);pad.rotation.x=Math.PI/2;pad.position.y=.05;joint.add(pad);cyl('pin_macro',.65,8,[0,2,0],'gold',joint);const fillet=new THREE.Mesh(new THREE.ConeGeometry(2.2,1.6,32),mat.silver);fillet.position.y=.8;fillet.name='solder_fillet';joint.add(fillet);
 const meter=group('multimeter');box('case',[30,9,47],[0,0,0],'orange',meter,2);box('face',[25,1,40],[0,5,0],'black',meter,1.5);box('LCD',[22,.4,11],[0,5.8,-10],'white',meter,.6);const readout=plateText('3.30 V',20,7,meter,[0,6.2,-10],'#172f25');readout.rotation.x=-Math.PI/2;cyl('dial',7,2,[0,6,5],'ground',meter);box('dial_marker',[1.5,.2,6],[0,7.1,3],'white',meter,.5);
 const probes=[];for(const name of ['red','ground']){const g=group(name+'_probe');line('probe_handle',[[0,0,0],[0,15,0]],1.2,name,g);line('probe_tip',[[0,0,0],[0,-6,0]],.3,'silver',g);probes.push(g);}
 const usb=group('USB_data');box('USB_C_plug',[8,3,7],[0,0,0],'silver',usb,.5);box('plug_housing',[10,4,11],[0,0,8],'white',usb,1);line('USB_cable',[[0,0,14],[0,1,32],[20,1,45],[40,1,47]],2,'white',usb);
 const robot=group('robot');
 const body=originals['2'];body.rotation.x=Math.PI/2;body.position.y=34;robot.add(body);body.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});
 const belly=originals['4'];belly.rotation.x=-Math.PI/2;belly.position.y=15.5;robot.add(belly);
 const face=originals['57'];face.rotation.set(0,-Math.PI/2,0);face.position.set(-54.5,34,0);robot.add(face);
 const faceDisplay=screen();faceDisplay.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0,0,1),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,-1,0)));faceDisplay.position.set(-55,34,0);robot.add(faceDisplay);
 const ears=[];for(let i=0;i<2;i++){let e=originals[i?'54':'51'];e.rotation.set(0,-Math.PI/2,0);e.position.set(-41,63.5,i?18:-18);robot.add(e);ears.push(e);}
 const legs=[];const legP=[[-34,9,-34.3],[-34,9,34.3],[34,9,-34.3],[34,9,34.3]];
 for(let i=0;i<4;i++){let e=originals[['27','34','41','48'][i]];e.rotation.set(0,i%2?0:Math.PI,0);e.position.set(...legP[i]);robot.add(e);legs.push(e);}
 const installedServos=[];for(let i=0;i<4;i++){const e=servos[i].clone(true);e.name='installed_servo_'+i;e.position.set(i<2?-29:39,23,i%2?14:-14);e.rotation.x=i%2?Math.PI/2:-Math.PI/2;robot.add(e);installedServos.push(e);}
 for(let i=0;i<4;i++){const pad=originals[['14','16','18','20'][i]];pad.position.set(0,10.7,-5.7);legs[i].add(pad);}
 const paw=originals['6'];paw.rotation.x=-Math.PI/2;paw.position.set(20,59.1,0);robot.add(paw);
 const tail=group('tail',robot);line('tail_stem',[[49,47,0],[62,53,0],[68,72,0]],2.4,'blue',tail);const heart=new THREE.Shape();heart.moveTo(0,-3);heart.bezierCurveTo(-9,2,-7,10,0,6);heart.bezierCurveTo(7,10,9,2,0,-3);const hg=new THREE.ExtrudeGeometry(heart,{depth:2,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.5,bevelThickness:.5});const hm=new THREE.Mesh(hg,mat.blue);hm.position.set(68,74,-1);hm.castShadow=true;tail.add(hm);
 const tools=group('soldering_tools');tools.add(tip,solder);
 return {THREE,mat,group,box,cyl,line,plateText,originals,pcbData,pcb,parts,padIndex,oled,servos,installedServos,speaker,battery,ledstrip,tip,solder,joint,fillet,meter,probes,usb,robot,body,belly,face,faceDisplay,legs,ears,tail,paw,
  async exportGLB(){const root=new THREE.Group();root.name='Caiyu_C3_Tutorial_Models';root.scale.setScalar(.001);const dog=robot.clone(true);dog.name='Caiyu_Dog_Teaching_Assembly';dog.visible=true;dog.traverse(o=>{o.visible=true;if(o.userData.horn)delete o.userData.horn;});root.add(dog);const board=pcb.clone(true);board.visible=true;board.traverse(o=>o.visible=true);board.position.set(-130,18,0);root.add(board);return new Promise(resolve=>new GLTFExporter().parse(root,resolve,console.error,{binary:true}));}};
}
