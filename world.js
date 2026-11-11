"use strict";

{
  const canvas = $("world");
  const ctx = canvas.getContext("2d");
  const width = canvas.width, height = canvas.height, ground = 182;
  const layers = new Map();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  ctx.imageSmoothingEnabled = false;

  function block(g, x, y, w, h, color) {
    const m = g.getTransform();
    if (m.b || m.c) {
      polygon(g, [[x,y],[x+w,y],[x+w,y+h],[x,y+h]], color, m);
      return;
    }
    const left=Math.round(m.a*x+m.e), top=Math.round(m.d*y+m.f);
    const right=Math.round(m.a*(x+w)+m.e), bottom=Math.round(m.d*(y+h)+m.f);
    if(left===right||top===bottom) return;
    g.save();
    g.resetTransform();
    g.fillStyle = color;
    g.fillRect(left,top,right-left,bottom-top);
    g.restore();
  }
  function polygon(g, points, color, m=g.getTransform()) {
    const pixels=points.map(([x,y])=>[Math.round(m.a*x+m.c*y+m.e),Math.round(m.b*x+m.d*y+m.f)]);
    const low=Math.min(...pixels.map(p=>p[1])), high=Math.max(...pixels.map(p=>p[1]));
    g.save();
    g.resetTransform();
    g.fillStyle = color;
    for(let y=low;y<high;y++) {
      const intersections=[];
      for(let i=0;i<pixels.length;i++) {
        const [ax,ay]=pixels[i], [bx,by]=pixels[(i+1)%pixels.length];
        const scan=y+.5;
        if((ay<=scan&&scan<by)||(by<=scan&&scan<ay)) intersections.push(ax+(scan-ay)*(bx-ax)/(by-ay));
      }
      intersections.sort((a,b)=>a-b);
      for(let i=0;i+1<intersections.length;i+=2) {
        const left=Math.round(intersections[i]), right=Math.round(intersections[i+1]);
        g.fillRect(left,y,right-left,1);
      }
    }
    g.restore();
  }
  function random(seed) {
    return () => {
      seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function cloud(g, x, y, size, color) {
    block(g,x,y,37*size,6*size,color);
    block(g,x+5*size,y-4*size,24*size,5*size,color);
    block(g,x+12*size,y-8*size,13*size,5*size,color);
    block(g,x+30*size,y+3*size,15*size,3*size,color);
  }
  function ridge(g, base, amplitude, phase, color) {
    for (let x=0; x<width; x+=2) {
      const y=base+Math.floor(Math.sin(x*.027+phase)*amplitude+Math.sin(x*.064+phase)*amplitude*.25);
      block(g,x,y,2,height-y,color);
    }
  }
  function oak(g, x, y, scale, palette, seed) {
    const rand=random(seed);
    const [shadow, bark, lit, darkLeaf, leaf, tip] = palette;
    g.save();
    g.translate(x,y);
    g.scale(scale,scale);
    polygon(g,[[-13,0],[-6,-8],[-5,-68],[-11,-87],[-3,-84],[2,-73],[6,-102],[10,-98],[8,-65],[12,-57],[9,-7],[19,0]],shadow);
    polygon(g,[[-4,-3],[-2,-66],[2,-70],[4,-53],[4,-12],[9,-3]],bark);
    block(g,-2,-52,2,29,lit);
    block(g,5,-31,2,19,lit);
    for (const [cx,cy,r] of [[-19,-77,19],[20,-80,21],[-7,-99,23],[13,-104,19]]) {
      polygon(g,[[cx-r,cy+2],[cx-r+5,cy-7],[cx-5,cy-12],[cx+r-7,cy-9],[cx+r,cy-3],[cx+r-3,cy+6],[cx+4,cy+11],[cx-r+5,cy+7]],shadow);
      polygon(g,[[cx-r+3,cy+2],[cx-r+7,cy-7],[cx-4,cy-10],[cx+r-8,cy-7],[cx+r-3,cy-1],[cx+r-6,cy+5],[cx+4,cy+8],[cx-r+7,cy+5]],darkLeaf);
      polygon(g,[[cx-r+5,cy-1],[cx-r+9,cy-7],[cx-4,cy-10],[cx+r-9,cy-6],[cx+r-5,cy-1],[cx+3,cy-3],[cx-4,cy+1]],leaf);
      for(let i=0;i<7;i++) {
        const px=cx-r*.58+rand()*r*1.15, py=cy-7+rand()*7;
        block(g,px,py,2+rand()*4,1,tip);
      }
    }
    g.restore();
  }
  function oval(g,x,y,rx,ry,color) {
    for (let dy=-ry;dy<=ry;dy++) {
      const span=Math.floor(rx*Math.sqrt(1-(dy/ry)**2));
      block(g,x-span,y+dy,span*2+1,1,color);
    }
  }
  function mushroom(g,x,y,size,cap) {
    g.save();
    g.translate(x,y);
    g.scale(size,size);
    polygon(g,[[-9,0],[-5,-23],[8,-23],[12,0]],"#d8ac80");
    polygon(g,[[-4,0],[-2,-20],[4,-20],[6,0]],"#ffe3b6");
    oval(g,0,-24,26,8,"#86564d");
    for(let h=0;h<15;h++) {
      const span=Math.round(26*Math.sqrt(1-((14-h)/15)**2));
      block(g,-span,-39+h,span*2,1,cap);
    }
    block(g,-20,-29,7,3,"#ffe4b7");
    block(g,-9,-36,8,3,"#ffe4b7");
    block(g,10,-31,6,4,"#ffe4b7");
    g.restore();
  }
  function lantern(g,x,y,lit) {
    block(g,x,y-18,2,18,"#755b43");
    block(g,x-1,y-19,9,2,"#755b43");
    if(lit) oval(g,x+7,y-13,9,9,"#ffd77d47");
    block(g,x+4,y-16,7,7,"#594c3a");
    block(g,x+5,y-15,5,5,lit?"#ffdd85":"#9f8b73");
  }
  function nest(g,x,y) {
    oval(g,x,y-13,53,14,"#5f4340");
    oval(g,x,y-18,53,9,"#987054");
    oval(g,x,y-18,43,6,"#65544b");
    const rand=random(181);
    for(let i=0;i<64;i++) {
      const dx=rand()*99-50, dy=rand()*13;
      block(g,x+dx,y-12+dy*.5,3+rand()*8,1,i%2?"#b68a62":"#765544");
    }
  }
  function background(place) {
    if(layers.has(place)) return layers.get(place);
    const layer=document.createElement("canvas");
    layer.width=width;
    layer.height=height;
    const g=layer.getContext("2d");
    const rand=random(142);
    const town=place==="town", camp=place==="camp", night=place==="ruin";
    const sky=town?["#172c36","#a78861"]:night?["#0c1528","#425575"]:["#17313e","#8ca588"];
    const gradient=g.createLinearGradient(0,12,0,ground);
    gradient.addColorStop(0,sky[0]);
    gradient.addColorStop(1,sky[1]);
    block(g,0,0,width,height,gradient);
    oval(g,177,59,night?16:10,night?16:10,night?"#b8bfad":"#b9a875");
    if(night) oval(g,183,54,14,14,"#30384b");
    for(const [x,y,s] of [[23,49,1.1],[105,34,.8],[215,62,1.4]]) cloud(g,x,y,s,"#b7b6a137");
    ridge(g,119,20,1.1,night?"#445975":"#728a77");
    ridge(g,143,14,4,night?"#2f415d":"#486e66");
    const distant=night?["#233047","#3c4c67","#5f7084","#34475f","#4b6077","#71859a"]:
      ["#264a47","#3e6358","#71887a","#385e54","#527866","#86a28b"];
    for(let i=0;i<15;i++) oak(g,i*22+rand()*12,151+rand()*19,.49+rand()*.25,distant,i+81);
    ridge(g,164,9,.5,night?"#303e40":"#495a49");
    const trees=night?["#141e2a","#343b50","#655e68","#243948","#3c5666","#5a7582"]:
      ["#152c2b","#594735","#9b7551","#24493c","#396448","#678f61"];
    oak(g,23,ground,1.35,trees,17);
    oak(g,264,ground,1.47,trees,23);
    if(town) {
      for(const [x,y,scale] of [[80,ground-4,1],[143,ground-7,.7],[210,ground-4,1.05]]) {
        const left=x-27*scale,right=x+27*scale,top=y-36*scale;
        polygon(g,[[left,y],[x-6*scale,top],[x+11*scale,top],[right,y]],"#414a42");
        polygon(g,[[left,y],[x-6*scale,top],[x+1*scale,top],[x-7*scale,y]],"#64634f");
        polygon(g,[[x-7*scale,y],[x+3*scale,top+7],[x+13*scale,y]],"#292e2b");
        block(g,x+16*scale,y-10,3,9,"#aa855b");
        block(g,x-11*scale,top-4,2,12,"#8a7959");
        block(g,x-7*scale,top,17*scale,2,"#b49a67");
        block(g,x-5*scale,y-2,18*scale,2,"#78684d");
      }
    } else if(camp) {
      mushroom(g,178,ground-5,1.05,"#6f5a4e");
      mushroom(g,220,ground-3,.44,"#71685c");
    } else if(night) {
      nest(g,186,ground-1);
    }
    for(const [x,scale] of [[41,.4],[63,.24],[228,.5],[244,.33]]) {
      polygon(g,[[x-11*scale,ground],[x-5*scale,ground-15*scale],[x+9*scale,ground-11*scale],[x+17*scale,ground]],night?"#626878":"#626858");
    }
    block(g,0,ground,width,height-ground,night?"#33343d":"#433d32");
    block(g,0,ground+8,width,10,night?"#4c4b54":"#635644");
    block(g,0,ground-1,width,4,night?"#526059":"#5c6b4e");
    for(let i=0;i<260;i++) {
      const x=rand()*width,y=ground+rand()*(height-ground);
      block(g,x,y,1+rand()*4,1,(night?["#474a59","#63616c","#3a3c47"]:["#5b503f","#73644f","#37352e"])[i%3]);
    }
    for(let i=0;i<96;i++) {
      const x=rand()*width, y=ground+rand()*6-4;
      block(g,x,y,2+rand()*4,1+rand()*3,(night?["#535e57","#687068","#3d4b47"]:["#4d5f46","#6a7657","#485640"])[i%3]);
    }
    for(const x of [53,128,232]) lantern(g,x,ground,town||camp);
    for(const [x,y,span] of [[22,199,28],[94,209,32],[140,194,27],[213,205,37],[258,194,23]]) {
      polygon(g,[[x,y],[x+4,y-3],[x+span-6,y-2],[x+span,y+1],[x+span-8,y+3],[x+3,y+3]],night?"#63687a":"#887351");
      block(g,x+5,y-2,span-12,1,night?"#8991a2":"#b49a6c");
    }
    layers.set(place,layer);
    return layer;
  }

  const fur = {
    fox:["#864736","#d7884d","#f2c996"],
    rabbit:["#62666d","#b2b7b1","#ede4cb"],
    raccoon:["#394d62","#869ba7","#d2d9cd"]
  };
  const scarves = {green:"#8fac5b",red:"#b7583e",blue:"#4c91a4"};

  function animal(x,y,profile,bob,armored) {
    const kind=Object.hasOwn(fur,profile?.species)?profile.species:"fox";
    const [shade,coat,cream]=fur[kind];
    const outline="#19232d";
    const scarf=scarves[profile?.outfit]||scarves.green;
    const h=y-bob;
    if(kind==="fox"||kind==="raccoon") {
      polygon(ctx,[[x-6,h-11],[x-25,h-18],[x-31,h-29],[x-22,h-30],[x-10,h-23],[x-3,h-17]],outline);
      polygon(ctx,[[x-8,h-13],[x-24,h-20],[x-29,h-28],[x-22,h-28],[x-12,h-23],[x-5,h-17]],coat);
      polygon(ctx,[[x-28,h-28],[x-22,h-28],[x-20,h-24],[x-23,h-21]],cream);
      if(kind==="raccoon") {
        block(ctx,x-24,h-26,3,7,shade);
        block(ctx,x-17,h-23,3,7,shade);
      }
    } else {
      oval(ctx,x-13,h-13,5,5,outline);
      oval(ctx,x-13,h-14,4,3,cream);
    }
    block(ctx,x-9,h-8,8,8,outline);
    block(ctx,x+3,h-8,9,8,outline);
    block(ctx,x-8,h-6,6,5,shade);
    block(ctx,x+4,h-6,7,5,shade);
    polygon(ctx,[[x-12,h-22],[x+8,h-24],[x+13,h-15],[x+10,h-3],[x-10,h-3]],outline);
    polygon(ctx,[[x-10,h-21],[x+7,h-22],[x+11,h-15],[x+8,h-5],[x-8,h-5]],armored?"#77858b":shade);
    polygon(ctx,[[x+1,h-20],[x+8,h-18],[x+7,h-8],[x+1,h-6]],armored?"#b8c4c1":cream);
    if(kind==="rabbit") {
      oval(ctx,x-7,h-50,5,13,outline);
      oval(ctx,x-7,h-50,3,11,coat);
      oval(ctx,x-7,h-50,1,8,"#d88d8b");
      oval(ctx,x+3,h-49,5,14,outline);
      oval(ctx,x+3,h-49,3,12,coat);
      oval(ctx,x+3,h-49,1,8,"#d88d8b");
    } else if(kind==="fox") {
      polygon(ctx,[[x-13,h-35],[x-14,h-54],[x-1,h-44],[x+7,h-43],[x+13,h-52],[x+15,h-34]],outline);
      polygon(ctx,[[x-12,h-37],[x-12,h-50],[x-2,h-43],[x+8,h-42],[x+12,h-48],[x+13,h-36]],coat);
      block(ctx,x-11,h-45,3,5,shade);
    } else {
      for(const ear of [-10,9]) {
        oval(ctx,x+ear,h-43,6,6,outline);
        oval(ctx,x+ear,h-43,4,4,coat);
        oval(ctx,x+ear,h-43,2,2,shade);
      }
    }
    polygon(ctx,[[x-15,h-38],[x-8,h-45],[x+8,h-44],[x+14,h-38],[x+20,h-31],[x+14,h-25],[x-3,h-23],[x-14,h-29]],outline);
    polygon(ctx,[[x-13,h-37],[x-7,h-43],[x+7,h-42],[x+12,h-37],[x+17,h-31],[x+13,h-27],[x-3,h-25],[x-12,h-30]],coat);
    block(ctx,x-7,h-42,13,1,cream);
    block(ctx,x-12,h-36,2,5,shade);
    polygon(ctx,[[x-2,h-32],[x+6,h-30],[x+17,h-32],[x+13,h-27],[x-3,h-25]],cream);
    if(kind==="raccoon") polygon(ctx,[[x-7,h-38],[x+13,h-38],[x+17,h-33],[x+3,h-32],[x-6,h-34]],"#434954");
    block(ctx,x+5,h-36,6,2,outline);
    block(ctx,x+8,h-35,2,2,"#dcc999");
    block(ctx,x+16,h-32,3,2,outline);
    polygon(ctx,[[x-10,h-23],[x+10,h-23],[x+8,h-17],[x-6,h-17],[x-15,h-10],[x-13,h-20]],scarf);
    block(ctx,x+9,h-17,7,5,coat);
    block(ctx,x-7,h-13,9,2,outline);
    block(ctx,x-3,h-14,3,3,"#cfac63");
    block(ctx,x-7,h-6,5,1,coat);
  }

  function creature(index,x,y,wings) {
    const flap=wings?3:0;
    if(index===0) {
      const h=y-17-flap;
      polygon(ctx,[[x,h],[x-22,h-6],[x-25,h-22],[x-10,h-19],[x,h-10],[x+13,h-22],[x+25,h-19],[x+18,h-5]],"#584b57");
      polygon(ctx,[[x,h-2],[x-20,h-8],[x-22,h-20],[x-10,h-17],[x,h-9],[x+14,h-20],[x+22,h-17],[x+16,h-6]],"#deb882");
      oval(ctx,x-12,h-12,5,5,"#f6d7a2");
      oval(ctx,x+13,h-12,4,5,"#e9d1a2");
      oval(ctx,x,h-7,6,12,"#7d6759");
      oval(ctx,x-2,h-12,6,5,"#a78e73");
      block(ctx,x-5,h-13,2,2,"#413b43");
      return;
    }
    if(index===1) {
      for(const offset of [-14,0,14]) block(ctx,x+offset-3,y-6,7,5,"#51424b");
      oval(ctx,x+3,y-12,22,11,"#50404a");
      oval(ctx,x+4,y-13,19,9,"#aa6c52");
      block(ctx,x+2,y-22,2,18,"#734f4c");
      oval(ctx,x+10,y-16,3,3,"#e4a774");
      oval(ctx,x-9,y-15,3,3,"#e4a774");
      oval(ctx,x-17,y-9,9,7,"#5a484b");
      polygon(ctx,[[x-18,y-14],[x-29,y-23],[x-27,y-13],[x-21,y-9]],"#63514c");
      block(ctx,x-20,y-11,2,2,"#ffd385");
      return;
    }
    const h=y-flap;
    for(const side of [-1,1]) {
      polygon(ctx,[[x+side*12,h-31],[x+side*(26+flap),h-42],[x+side*(37+flap),h-36],[x+side*32,h-17],[x+side*13,h-9]],"#483a51");
      polygon(ctx,[[x+side*13,h-30],[x+side*(26+flap),h-39],[x+side*(34+flap),h-35],[x+side*29,h-19],[x+side*15,h-13]],"#986f77");
    }
    polygon(ctx,[[x-25,h-32],[x+23,h-32],[x+19,h-9],[x+8,h],[x-10,h],[x-21,h-10]],"#201f30");
    polygon(ctx,[[x-20,h-31],[x+20,h-31],[x+16,h-10],[x+6,h-3],[x-9,h-4],[x-17,h-12]],"#655971");
    polygon(ctx,[[x-12,h-26],[x+12,h-26],[x+8,h-10],[x,h-5],[x-9,h-11]],"#be956c");
    polygon(ctx,[[x-26,h-54],[x-8,h-47],[x+8,h-47],[x+26,h-54],[x+24,h-32],[x+11,h-23],[x-11,h-23],[x-24,h-32]],"#433a49");
    for(const side of [-1,1]) {
      polygon(ctx,[[x+side*3,h-38],[x+side*20,h-45],[x+side*17,h-34],[x+side*9,h-30]],"#b4a08b");
      block(ctx,x+side*10-2,h-37,4,3,"#e0a860");
      block(ctx,x+side*10-1,h-37,2,1,"#fff1ae");
      for(let i=0;i<3;i++) block(ctx,x+side*(5+i*2)-2,h-21+i*4,4,1,"#775a5c");
      block(ctx,x+side*9-3,h-3,7,3,"#9f805b");
    }
    polygon(ctx,[[x-4,h-32],[x+4,h-32],[x,h-26]],"#efaf64");
  }

  function shadow(x,y,w) {
    block(ctx,x-w/2+3,y-2,w-6,4,"#222e2c77");
    block(ctx,x-w/2,y-1,w,2,"#222e2c66");
  }
  function hero(x,y,profile,weaponId,bob,attack) {
    shadow(x,y,34);
    animal(x,y,profile,bob,Boolean(profile?.showArmor));
    if(!weaponId) return;
    const grip=y-17-bob;
    if(weaponId==="bow") {
      block(ctx,x+16,grip-10,2,21,"#cf905f");
      block(ctx,x+14,grip-11,4,2,"#f0c384");
      block(ctx,x+14,grip+9,4,2,"#f0c384");
      block(ctx,x+14,grip-9,1,18,"#f3dfac");
    } else if (weaponId==="staff") {
      block(ctx,x+15,grip-15,3,26,"#9c684a");
      block(ctx,x+14,grip-18,5,6,"#78c799");
      block(ctx,x+15,grip-20,3,8,"#b5f0aa");
    } else {
      ctx.save();
      ctx.translate(x+15,grip);
      ctx.rotate(attack?1.34:.30);
      block(ctx,-2,-21,5,21,"#303941");
      block(ctx,-1,-22,3,20,"#e7ece0");
      block(ctx,1,-20,1,18,"#8fa8ae");
      block(ctx,-4,-2,9,2,"#f4c47c");
      block(ctx,0,0,2,5,"#8b6554");
      ctx.restore();
    }
  }
  function particles(x,y,age,color,count) {
    for(let i=0;i<count;i++) {
      const angle=i*2.39, distance=(9+i%5*3)*age;
      block(ctx,x+Math.cos(angle)*distance,y+Math.sin(angle)*distance+age*age*5,i%3===0?3:2,2,color);
    }
  }
  function impact(x, target, y, id, progress, special, blocked, slam, damage = true) {
    const a=1-progress;
    ctx.save();
    ctx.globalAlpha=a;
    if(slam) {
      const radius=10+progress*39;
      block(ctx,target-radius,y-3,radius*2,2,"#ffc79d");
      particles(target,y-4,progress,"#eea17e",19);
    }
    if (blocked) {
      polygon(ctx,[[x+10,y-38],[x+25,y-34],[x+25,y-20],[x+17,y-12],[x+10,y-20]],"#b1e9d0");
      polygon(ctx,[[x+12,y-35],[x+23,y-32],[x+23,y-21],[x+17,y-15],[x+12,y-21]],"#548f84");
    } else if (!damage) {
      particles(x,y-21,progress,"#f6b297",8);
    } else if (id==="bow") {
      const arrow=x+18+(target-x-12)*Math.min(1,progress*2.9);
      block(ctx,arrow-21,y-25,23,2,"#ffd38d");
      block(ctx,arrow,y-27,4,6,"#fff3be");
    } else if(id==="staff") {
      const center=x+19+(target-x-15)*Math.min(1,progress*2.6);
      block(ctx,center-13,y-26,19,4,"#82d8a5");
      block(ctx,center,y-29,8,10,"#c5ffc2");
    } else {
      const offset=progress*20;
      polygon(ctx,[[x+4+offset,y-42],[x+22+offset,y-42],[x+42+offset,y-29],[x+45+offset,y-21],[x+36+offset,y-10],[x+19+offset,y-6],[x+33+offset,y-22],[x+26+offset,y-31]],special?"#ffb764":"#b1e5d5");
      polygon(ctx,[[x+22+offset,y-40],[x+38+offset,y-28],[x+41+offset,y-21],[x+34+offset,y-13],[x+36+offset,y-23]],"#fff7d8");
    }
    if(damage) particles(target,y-23,progress,special?"#ffe3a2":"#e6f9ce",special?18:10);
    ctx.restore();
  }

  const teamX=[129,111,84,67];
  let targetX=184;
  const sceneSize=new ResizeObserver(([entry])=>{
    const {width:visibleWidth,height:visibleHeight}=entry.contentRect;
    if(!visibleHeight) return;
    const crop=Math.max(0,(width-height*visibleWidth/visibleHeight)/2);
    const left=Math.max(67,crop+16), right=Math.min(184,width-crop-34);
    targetX=right;
    [129,111,84,67].forEach((x,i)=>{ teamX[i]=left+(x-67)/117*(right-left); });
  });
  sceneSize.observe(canvas);
  const teamY=[182,167,182,167];
  const weaponsByAlly={raccoon:"",fox:"sword",rabbit:"staff",owl:"bow"};
  function drawMember(id,x,y,bob,attack) {
    const a=allies[id];
    ctx.save();
    ctx.translate(Math.round(x),Math.round(y));
    ctx.scale(.68,.68);
    if(id==="owl") {
      shadow(0,0,34);
      const dy=-bob;
      oval(ctx,0,-17+dy,16,17,"#19232d");
      oval(ctx,0,-17+dy,13,14,"#ad8e8b");
      polygon(ctx,[[-16,-35+dy],[-16,-44+dy],[-7,-39+dy],[8,-39+dy],[16,-44+dy],[17,-31+dy],[9,-21+dy],[-10,-21+dy]],"#19232d");
      oval(ctx,0,-32+dy,14,9,"#bfa296");
      for(const side of [-1,1]) {
        oval(ctx,side*6,-30+dy,5,5,"#f4dfba");
        block(ctx,side*6-1,-31+dy,2,3,"#48394a");
      }
      block(ctx,0,-25+dy,3,3,"#f1b96c");
      block(ctx,-7,-20+dy,14,3,"#71a5b2");
      block(ctx,12,-18+dy,3,9,"#d7ad75");
    } else hero(0,0,{species:id,outfit:a.outfit},weaponsByAlly[id],bob,attack);
    ctx.restore();
  }

  function drawCamp(clock) {
    if(state.garden) {
      block(ctx,101,ground-3,63,5,"#6e5942");
      for(let i=0;i<9;i++) {
        const x=105+i*6, y=ground-5-(i%3);
        block(ctx,x,y,2,5,"#5d7d43");
        block(ctx,x-2,y-2,5,3,i%2?"#a1b96a":"#bfd786");
      }
    }
    if(state.tower) {
      block(ctx,165,ground-42,3,43,"#74513d");
      block(ctx,180,ground-42,3,43,"#74513d");
      for(let y=ground-10;y>ground-40;y-=7) block(ctx,165,y,17,2,"#af845e");
      block(ctx,160,ground-43,28,5,"#a67450");
      block(ctx,164,ground-49,20,7,"#c39b62");
      block(ctx,172,ground-56,12,3,"#6a7d84");
    }
    for(const [i,id] of state.owned.entries()) {
      const x=[94,126,153,174][i];
      const bob=Math.floor(clock/200+i)%2;
      const tended=id==="rabbit"&&state.garden;
      const scouting=id==="owl"&&state.tower;
      drawMember(id,tended?125+Math.sin(clock/470)*9:x,scouting?ground-43:ground,bob,false);
      if(tended&&bob) particles(x,ground-7,.3,"#cce997",4);
    }
  }

  function drawCampStrip(clock) {
    const strip=$("camp-art");
    if(!strip) return;
    const g=strip.getContext("2d");
    g.imageSmoothingEnabled=false;
    g.drawImage(background("town"),0,122,280,76,0,0,300,36);
    const count=state.owned.length+2;
    const bed=300*(count-1.5)/count, tower=300*(count-.5)/count;
    block(g,bed-19,28,38,5,"#845d42");
    for(let i=0;i<(state.garden?8:4);i++) {
      const x=bed-16+i*5, y=24-(i%2);
      block(g,x,y,2,6,"#497541");
      block(g,x-1,y,4,2,"#c3d576");
    }
    const high=state.tower?7:16;
    block(g,tower-9,high,2,16,"#725640");
    block(g,tower+8,high,2,16,"#725640");
    block(g,tower-12,high,24,4,"#a6744c");
    block(g,tower-5,high-3,11,2,"#637c80");
    if(state.tower&&Math.floor(clock/450)%2) block(g,tower+7,high-4,3,1,"#ffebad");
  }
  const facilityFrames=new WeakMap();
  function drawFacilities() {
    for(const tile of document.querySelectorAll(".facility-art")) {
      const id=tile.dataset.facility, improved=Boolean(state[id]);
      if(facilityFrames.get(tile)===improved) continue;
      facilityFrames.set(tile,improved);
      const g=tile.getContext("2d");
      g.clearRect(0,0,68,38);
      polygon(g,[[2,30],[17,22],[61,23],[67,32],[54,36],[9,36]],"#192927");
      if(id==="garden") {
        const left=improved?6:14, right=improved?63:54;
        polygon(g,[[left,30],[left+8,19],[right-6,19],[right,29],[right-7,34],[left+3,34]],"#a0784e");
        for(let y=21;y<=29;y+=4) block(g,left+7,y,right-left-14,2,"#554036");
        for(let i=0;i<(improved?14:8);i++) {
          const x=left+9+i%7*6, y=21+Math.floor(i/7)*7;
          if(x>right-5) continue;
          block(g,x,y-6,2,7,"#769d56");
          block(g,x-3,y-5,4,2,"#acc970");
          block(g,x+1,y-7,3,2,"#c9dc8d");
        }
        block(g,left+3,29,right-left-9,2,"#d9aa72");
      } else {
        const top=improved?6:12;
        polygon(g,[[16,33],[22,top+6],[26,top+6],[23,33]],"#a6784f");
        polygon(g,[[48,33],[43,top+6],[47,top+6],[54,33]],"#a6784f");
        for(let y=top+12;y<33;y+=5) block(g,25,y,20,2,"#6c503d");
        block(g,19,top+5,32,4,"#c99765");
        block(g,21,top,2,6,"#a6784f");
        block(g,47,top,2,6,"#a6784f");
        block(g,20,top,30,2,"#e0b77b");
        polygon(g,[[29,top-1],[42,top-5],[46,top-2],[32,top+2]],"#9bb5b9");
        if(improved) block(g,46,top-4,3,2,"#f3d08f");
      }
    }
  }

  let lastFrame=0;
  function frame(time) {
    requestAnimationFrame(frame);
    if(document.hidden||time-lastFrame<32) return;
    lastFrame=time;
    const clock=motion.matches?0:time;
    drawCampStrip(clock);
    drawFacilities();
    const view=battleView(), hunt=hunts[round?.index??state.hunt], place=view.camp?"town":hunt.place;
    ctx.drawImage(background(place),0,0);
    for(let i=0;i<13;i++) {
      const x=(i*43+clock*(.007+i%3*.003))%width, y=67+i*17%100+Math.sin(clock*.001+i)*7;
      block(ctx,x-1,y-1,4,4,"#ffe59b38");
      block(ctx,x,y,2,2,"#ffec9c");
    }
    if(view.camp) {
      drawCamp(clock);
      return;
    }
    const flash=!motion.matches&&view.age<480&&view.frame>0;
    const progress=Math.min(1,Math.max(0,view.age/480));
    const target=targetX;
    if(view.data.warning) {
      for(const i of view.data.warning.targets) oval(ctx,teamX[i],teamY[i]+1,16,4,"#f36358cf");
    }
    const hits=new Set(flash?view.data.events.filter(e=>e.kind==="hit").map(e=>e.to):[]);
    const strikes=new Set(flash?view.data.events.filter(e=>e.kind==="attack"||e.kind==="special").map(e=>e.from):[]);
    for(const i of [1,3,0,2]) {
      const id=round.lineup[i];
      if(!id||view.data.hp[i]<=0&&!hits.has(i)) continue;
      const recoil=hits.has(i)?Math.sin(progress*Math.PI)*7:0;
      const advance=strikes.has(i)&&id==="fox"?Math.sin(progress*Math.PI)*12:0;
      drawMember(id,teamX[i]+advance-recoil,teamY[i],Math.floor(clock/200+i)%2,strikes.has(i));
    }
    if(view.data.foe>0||flash) {
      const hit=strikes.size?Math.sin(progress*Math.PI)*4:0;
      const y=ground-(view.data.warning?5:0);
      shadow(target,ground,hunt.sprite===2?50:32);
      ctx.save();
      ctx.translate(target+hit,y);
      ctx.scale(.82,.82);
      creature(hunt.sprite,0,0,Math.floor(clock/190)%2);
      ctx.restore();
    }
    if(!flash) return;
    for(const event of view.data.events) {
      if(event.kind==="attack"||event.kind==="special") {
        const id=round.lineup[event.from];
        const special=event.kind==="special";
        const offset=special?0:6;
        if(id==="fox") {
          impact(teamX[event.from],target,ground+offset,"sword",progress,special,false,false);
          if(special&&progress>.16) impact(teamX[event.from]+10,target,ground-9,"sword",(progress-.16)/.84,true,false,false);
        }
        else if(id==="owl") {
          impact(teamX[event.from],target,ground+offset,"bow",progress,special,false,false);
          if(special) particles(target,ground-25,progress,"#a7c6ff",14);
        }
        else particles(target,ground-24,progress,"#ffe1a0",5);
      } else if(event.kind==="guard") {
        const x=teamX[event.to],y=teamY[event.to];
        polygon(ctx,[[x+3,y-26],[x+14,y-29],[x+19,y-24],[x+16,y-15],[x+9,y-12],[x+4,y-17]],"#f0cf86");
        polygon(ctx,[[x+6,y-24],[x+14,y-26],[x+16,y-23],[x+14,y-17],[x+9,y-15],[x+7,y-18]],"#6a8891");
      } else if(event.kind==="hit") {
        const x=teamX[event.to], y=teamY[event.to];
        particles(x,y-20,progress,"#f5ab86",8);
        if(round.lineup[event.to]==="raccoon") block(ctx,x+8,y-24,2,14,"#dcddaa");
      } else {
        const x=teamX[event.to], y=teamY[event.to];
        if(event.kind==="heal") {
          const start=teamX[event.from];
          block(ctx,start+(x-start)*progress,y-32,4,3,"#bce795");
        }
        particles(x,y-26,progress,"#cbf6a5",9);
        if(event.skill) {
          block(ctx,x-2,y-34-progress*8,5,1,"#e2ffb6");
          block(ctx,x,y-36-progress*8,1,5,"#e2ffb6");
        }
      }
    }
  }
  requestAnimationFrame(frame);
}
