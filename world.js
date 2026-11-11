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
    const town=place==="town", camp=place==="camp", night=place==="ruin", canyon=place==="canyon",highland=place==="highland";
    const sky=town?["#172c36","#a78861"]:night?["#0c1528","#425575"]:["#17313e","#8ca588"];
    const gradient=g.createLinearGradient(0,12,0,ground);
    gradient.addColorStop(0,sky[0]);
    gradient.addColorStop(1,sky[1]);
    block(g,0,0,width,height,gradient);
    if(highland) {
      block(g,0,0,width,height,"#749ba5");
      polygon(g,[[0,141],[68,66],[113,135],[183,51],[280,140],[280,182],[0,182]],"#b1b5a1");
      polygon(g,[[42,96],[68,66],[87,94],[68,86]],"#d8dfce");
      polygon(g,[[158,83],[183,51],[210,88],[184,74]],"#e2e2d2");
    }
    if(canyon) {
      block(g,0,0,width,height,"#594c4a");
      for(const [x,top,span] of [[0,63,49],[58,111,25],[222,72,58],[188,116,24]]) {
        polygon(g,[[x,ground],[x,top+16],[x+span*.45,top],[x+span,top+9],[x+span,ground]],"#966b55");
        for(let y=top+15;y<ground;y+=12) block(g,x,y,span,2,"#c19369");
      }
    }
    oval(g,177,59,night?16:10,night?16:10,night?"#b8bfad":"#b9a875");
    if(night) oval(g,183,54,14,14,"#30384b");
    for(const [x,y,s] of [[23,49,1.1],[105,34,.8],[215,62,1.4]]) cloud(g,x,y,s,"#b7b6a137");
    ridge(g,119,20,1.1,night?"#445975":"#728a77");
    ridge(g,143,14,4,night?"#2f415d":"#486e66");
    const distant=night?["#233047","#3c4c67","#5f7084","#34475f","#4b6077","#71859a"]:
      ["#264a47","#3e6358","#71887a","#385e54","#527866","#86a28b"];
    if(!highland) for(let i=0;i<15;i++) oak(g,i*22+rand()*12,151+rand()*19,.49+rand()*.25,distant,i+81);
    ridge(g,164,9,.5,night?"#303e40":"#495a49");
    const trees=night?["#141e2a","#343b50","#655e68","#243948","#3c5666","#5a7582"]:
      ["#152c2b","#594735","#9b7551","#24493c","#396448","#678f61"];
    if(!highland) {
      oak(g,23,ground,1.35,trees,17);
      oak(g,264,ground,1.47,trees,23);
    }
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
    raccoon:["#394d62","#869ba7","#d2d9cd"],
    wolf:["#435767","#8fabb7","#d6e4db"],
    bear:["#594535","#947454","#d3b387"]
  };
  const scarves = {green:"#8fac5b",red:"#b7583e",blue:"#4c91a4"};

  function creature(index,x,y,wings) {
    const flap=wings?3:0;
    if(index===3) {
      polygon(ctx,[[x-25,y-5],[x-21,y-19],[x-8,y-25],[x+12,y-22],[x+24,y-12],[x+30,y-15],[x+25,y-4],[x+13,y-5],[x+10,y],[x+4,y],[x+4,y-7],[x-12,y-8],[x-15,y],[x-22,y]],"#192b35");
      polygon(ctx,[[x-23,y-7],[x-19,y-18],[x-7,y-23],[x+11,y-20],[x+20,y-11],[x+13,y-7],[x+4,y-9],[x-12,y-10]],"#738b96");
      polygon(ctx,[[x-23,y-17],[x-22,y-29],[x-13,y-24],[x-5,y-26],[x-9,y-14]],"#a6b7bc");
      block(ctx,x-20,y-21,6,2,"#f0c680");
      return;
    }
    if(index===4) {
      for(const offset of [-17,13]) block(ctx,x+offset-3,y-8,8,8,"#25323a");
      polygon(ctx,[[x-31,y-11],[x-20,y-30],[x+13,y-33],[x+29,y-20],[x+25,y-5],[x-17,y-3]],"#24313b");
      polygon(ctx,[[x-20,y-27],[x+11,y-30],[x+25,y-19],[x+21,y-8],[x-14,y-6]],"#83929a");
      for(let i=0;i<4;i++) block(ctx,x-14+i*8,y-27,2,18,"#c0c4b8");
      polygon(ctx,[[x-30,y-22],[x-15,y-23],[x-19,y-8],[x-38,y-10]],"#5b534f");
      polygon(ctx,[[x-32,y-10],[x-37,y-22],[x-35,y-5],[x-23,y-5]],"#e1cda2");
      block(ctx,x-29,y-19,4,2,"#f2bd72");
      return;
    }
    if(index===0) {
      for(let i=0;i<5;i++) {
        const dx=x-18+i*8, h=y-8-Math.sin(i+flap)*2;
        oval(ctx,dx,h,7,7,"#142b2a");
        oval(ctx,dx,h-1,5,5,i%2?"#86a468":"#b3b87c");
        polygon(ctx,[[dx-2,h-6],[dx,h-13],[dx+3,h-6]],"#e0ca91");
        block(ctx,dx-3,y-2,3,3,"#786a43");
      }
      block(ctx,x-20,y-13,2,3,"#e8c18a");
      block(ctx,x-16,y-13,2,3,"#263738");
      return;
    }
    if(index===5) {
      for(const side of [-1,1]) for(let i=0;i<4;i++) {
        polygon(ctx,[[x+side*5,y-11],[x+side*(17+i*3),y-24+i*6],[x+side*(25+i),y-3]],"#172d37");
        block(ctx,x+side*(20+i),y-6,2,5,"#78a6a4");
      }
      oval(ctx,x+8,y-15,13,11,"#243f47");
      oval(ctx,x+8,y-17,10,8,"#4e8990");
      oval(ctx,x-7,y-10,10,8,"#25343c");
      block(ctx,x-13,y-13,2,2,"#edd793");block(ctx,x-8,y-13,2,2,"#edd793");
      block(ctx,x+7,y-21,5,3,"#a3c8bb");
      return;
    }
    if(index===6) {
      polygon(ctx,[[x-8,y-15],[x-37,y-33-flap*5],[x-30,y-40-flap*5],[x-1,y-25],[x+30,y-40+flap*3],[x+37,y-32+flap*3],[x+10,y-13],[x,y-3]],"#172935");
      polygon(ctx,[[x-8,y-18],[x-33,y-34-flap*5],[x-29,y-36-flap*5],[x-1,y-22],[x+29,y-36+flap*3],[x+32,y-32+flap*3],[x+9,y-17]],"#8e9c9e");
      oval(ctx,x,y-17,8,11,"#4c6270");
      oval(ctx,x-5,y-27,9,7,"#d7d8c6");
      polygon(ctx,[[x-12,y-28],[x-22,y-23],[x-11,y-21]],"#d4ac60");
      block(ctx,x-10,y-29,3,2,"#172935");
      return;
    }
    if(index===7) {
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
  function drawMember(id,x,y,bob,attack) {
    const outline="#13212a", a=allies[id];
    const palette=fur[id]||["#4f4c58","#9c8e9d","#ded8bd"];
    const [shade,coat,light]=palette;
    const step=motion.matches?0:bob*2;
    ctx.save();
    ctx.translate(Math.round(x),Math.round(y));
    ctx.scale(.67,.67);
    shadow(0,0,id==="bear"?51:42);
    if(id==="owl") {
      const flap=step*3;
      polygon(ctx,[[-6,-15],[-28,-27-flap],[-22,-30-flap],[-2,-22],[15,-30],[27,-20+flap],[21,-17+flap],[10,-20],[8,-9]],outline);
      polygon(ctx,[[-7,-17],[-25,-27-flap],[-21,-27-flap],[-1,-20],[14,-27],[24,-20+flap],[20,-20+flap],[9,-22],[7,-12]],"#8a7c93");
      oval(ctx,2,-15,13,12,outline);oval(ctx,2,-15,10,9,"#b3a28f");
      polygon(ctx,[[-6,-23],[-9,-36],[-2,-32],[9,-32],[16,-37],[16,-23],[10,-17],[-1,-17]],outline);
      oval(ctx,4,-26,11,8,"#afa2ae");
      for(const side of [-1,1]) {
        oval(ctx,4+side*5,-27,4,4,"#e8d5ad");
        block(ctx,4+side*5,-28,2,3,"#17252e");
      }
      polygon(ctx,[[7,-23],[14,-23],[10,-19]],"#dbb275");
      block(ctx,-2,-6,4,5,"#c6a36d");block(ctx,8,-6,4,5,"#c6a36d");
    } else if(id==="rabbit") {
      oval(ctx,-8,-12,17,12,outline);oval(ctx,-8,-13,14,10,coat);
      oval(ctx,-21,-11,5,5,light);
      for(const [px,py] of [[-14,-3],[3,-3]]) {
        block(ctx,px,py-step,12,4+step,outline);
        block(ctx,px+1,py-step,9,2+step,light);
      }
      oval(ctx,9,-20,13,10,outline);oval(ctx,9,-21,10,8,coat);
      for(const ear of [1,11]) {
        polygon(ctx,[[ear,-27],[ear-2,-44],[ear+3,-49],[ear+6,-42],[ear+5,-27]],outline);
        block(ctx,ear,-42,3,14,light);block(ctx,ear+1,-43,1,12,"#b67d82");
      }
      block(ctx,12,-24,3,3,"#15242d");block(ctx,20,-20,3,2,"#c18f86");
      block(ctx,2,-15,11,3,"#8fac5b");
    } else {
      const bear=id==="bear", wolf=id==="wolf";
      const back=bear?-25:-19, length=bear?22:18, shoulder=bear?26:21;
      if(!bear) {
        polygon(ctx,[[back+7,-10],[back-14,-8],[back-25,-19],[back-22,-25],[back-7,-18],[back+6,-19]],outline);
        polygon(ctx,[[back+6,-12],[back-14,-11],[back-22,-20],[back-20,-22],[back-6,-16],[back+4,-17]],coat);
        if(id==="raccoon") {
          block(ctx,back-16,-20,3,7,shade);block(ctx,back-10,-17,3,7,shade);
        } else polygon(ctx,[[back-22,-20],[back-20,-22],[back-14,-19],[back-16,-15]],light);
      }
      for(const [i,leg] of [-15,-4,9,17].entries()) {
        const movement=(i%2?step:-step);
        block(ctx,leg,-11+movement,bear?8:6,11-movement,outline);
        block(ctx,leg+1,-10+movement,bear?5:3,8-movement,shade);
        block(ctx,leg,-2,bear?9:7,2,outline);
      }
      polygon(ctx,[[back,-9],[back-2,-20],[back+6,-shoulder-4],[length-6,-shoulder-6],[length+2,-18],[length+3,-8],[length-4,-5],[back+8,-6]],outline);
      polygon(ctx,[[back+2,-10],[back,-19],[back+7,-shoulder-2],[length-7,-shoulder-4],[length,-17],[length,-10],[length-5,-8],[back+8,-9]],coat);
      block(ctx,back+8,-shoulder-2,length-back-17,2,light);
      polygon(ctx,[[8,-19],[8,-32],[13,-38],[22,-34],[27,-27],[wolf?39:33,-24],[wolf?38:32,-18],[24,-14],[14,-13]],outline);
      polygon(ctx,[[11,-20],[11,-31],[14,-35],[21,-31],[24,-25],[wolf?36:30,-23],[wolf?35:29,-20],[23,-17],[14,-16]],coat);
      if(bear) {
        oval(ctx,10,-31,5,5,outline);oval(ctx,10,-31,3,3,shade);
        oval(ctx,22,-32,4,4,outline);oval(ctx,22,-32,2,2,shade);
      } else {
        polygon(ctx,[[11,-29],[9,-42],[15,-38],[18,-31]],outline);
        polygon(ctx,[[20,-30],[21,-40],[26,-34],[25,-27]],outline);
        block(ctx,11,-38,2,5,shade);
      }
      polygon(ctx,[[20,-22],[wolf?36:30,-23],[wolf?35:29,-20],[23,-17],[17,-17]],light);
      if(id==="raccoon") polygon(ctx,[[12,-30],[24,-29],[26,-24],[17,-24],[11,-26]],"#243441");
      block(ctx,21,-28,3,2,outline);block(ctx,wolf?36:30,-24,3,2,outline);
      polygon(ctx,[[8,-22],[13,-24],[19,-14],[16,-10],[12,-17],[4,-14]],scarves[a.outfit]);
      if(state.equipped[id]?.armor) {
        block(ctx,1,-22,7,12,"#30444f");block(ctx,2,-21,5,9,"#9eafb4");
      }
    }
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
      const x=79+i*19;
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
    const bed=30, tower=90;
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
      } else if(id==="tower") {
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
      } else if(id==="forge") {
        block(g,12,14,27,20,"#765748");
        polygon(g,[[10,14],[17,5],[33,5],[41,14]],"#b38a63");
        block(g,19,17,13,14,"#332e31");
        block(g,22,22,7,8,"#f0a763");
        block(g,43,22,16,4,"#a5b6b5");block(g,47,26,7,7,"#667c81");
      } else if(id==="board") {
        block(g,17,8,36,23,"#9d7954");
        block(g,20,11,30,16,"#504b3e");
        block(g,19,29,3,6,"#74563f");block(g,48,29,3,6,"#74563f");
        for(let i=0;i<3;i++) block(g,23+i*9,13,6,10,"#e7c58d");
      } else {
        polygon(g,[[8,17],[21,5],[47,5],[61,17]],"#728466");
        block(g,13,17,43,16,"#9c7f5b");
        block(g,31,22,9,11,"#3d4c44");
        block(g,18,20,7,6,"#e4c58d");block(g,44,20,7,6,"#e4c58d");
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
    const targetButtons=$("enemy-targets").children;
    if(view.camp) for(const button of targetButtons) button.hidden=true;
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
    const group=enemyGroup(round.index);
    const enemySpot=i=>({x:target+[-7,12,17][i],y:ground+[0,-25,-5][i]});
    const scale=Math.max(canvas.clientWidth/width,canvas.clientHeight/height);
    const offsetX=(canvas.clientWidth-width*scale)/2,offsetY=canvas.clientHeight-height*scale;
    const focused=focusChoice(view);
    for(let i=0;i<targetButtons.length;i++) {
      const button=targetButtons[i], spot=enemySpot(i);
      button.hidden=!view.combat||view.data.enemies[i]<=0;
      button.style.left=(offsetX+(spot.x-19)*scale)+"px";
      button.style.top=(offsetY+(spot.y-(group[i].boss?49:43))*scale)+"px";
      button.style.width=(38*scale)+"px";
      button.style.height=((group[i].boss?51:45)*scale)+"px";
      button.setAttribute("aria-label",group[i].name+" "+(i+1)+" 우선 공격");
      button.setAttribute("aria-pressed",String(focused===i));
    }
    for(let i=2;i>=0;i--) {
      const enemy=group[i], spot=enemySpot(i);
      const attacked=flash&&view.data.events.some(e=>(e.kind==="attack"||e.kind==="special")&&e.enemy===i);
      if(view.data.enemies[i]<=0&&!attacked) continue;
      const hit=attacked?Math.sin(progress*Math.PI)*4:0;
      const lunging=flash&&view.data.events.some(e=>e.kind==="hit"&&e.enemy===i);
      const advance=lunging?Math.sin(progress*Math.PI)*7:0;
      const y=spot.y-(enemy.boss&&view.data.warning?5:0);
      if(focused===i) {
        oval(ctx,spot.x,spot.y,17,4,"#f4c76e");
        oval(ctx,spot.x,spot.y-1,13,2,"#60492f");
        block(ctx,spot.x-3,spot.y-(enemy.boss?53:42),7,2,"#f4c76e");
        polygon(ctx,[[spot.x-3,spot.y-(enemy.boss?51:40)],[spot.x+4,spot.y-(enemy.boss?51:40)],[spot.x,spot.y-(enemy.boss?47:36)]],"#f4c76e");
      }
      shadow(spot.x,spot.y,enemy.boss?45:24);
      ctx.save();
      ctx.translate(spot.x+hit-advance,y);
      const scale=enemy.boss?.74:.57;
      ctx.scale(scale,scale);
      creature(enemy.sprite,0,0,Math.floor(clock/190+i)%2);
      ctx.restore();
      const top=spot.y-(enemy.boss?46:enemy.sprite===0?28:21);
      block(ctx,spot.x-11,top,23,3,"#182520");
      block(ctx,spot.x-10,top+1,21*Math.max(0,view.data.enemies[i])/enemy.max,1,enemy.boss?"#f0a574":"#d9b78a");
    }
    if(!flash) return;
    for(const event of view.data.events) {
      if(event.kind==="attack"||event.kind==="special") {
        const id=round.lineup[event.from];
        const spot=enemySpot(event.enemy??0);
        const special=event.kind==="special";
        const offset=special?0:6;
        if(id==="fox"||id==="wolf") {
          impact(teamX[event.from],spot.x,spot.y+offset,"sword",progress,special,false,false);
          if(special&&progress>.16) impact(teamX[event.from]+10,spot.x,spot.y-9,"sword",(progress-.16)/.84,true,false,false);
        }
        else if(id==="owl") {
          impact(teamX[event.from],spot.x,spot.y+offset,"bow",progress,special,false,false);
          if(special) particles(spot.x,spot.y-25,progress,"#a7c6ff",14);
        }
        else particles(spot.x,spot.y-24,progress,"#ffe1a0",5);
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
