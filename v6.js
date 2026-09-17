// Nokia OS v6 patch: preserve photo aspect ratio + Nokia-style keypad tones
(function(){
  function unlockAudio(){
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    } catch(e){ return null; }
  }
  document.addEventListener('pointerdown', unlockAudio, {passive:true});

  // Short dual-tone electronic beep, closer to classic Nokia key tones than a mechanical click.
  clickTone = function(type='key'){
    if (!soundOn) return;
    const a = unlockAudio();
    if (!a) return;
    const now = a.currentTime;

    if (type === 'capture') {
      const o1 = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain();
      o1.type='square'; o2.type='sine';
      o1.frequency.setValueAtTime(1180, now); o1.frequency.exponentialRampToValueAtTime(760, now+.085);
      o2.frequency.setValueAtTime(590, now); o2.frequency.exponentialRampToValueAtTime(420, now+.085);
      g.gain.setValueAtTime(.0001, now);
      g.gain.exponentialRampToValueAtTime(.045, now+.003);
      g.gain.exponentialRampToValueAtTime(.0001, now+.1);
      o1.connect(g); o2.connect(g); g.connect(a.destination);
      o1.start(now); o2.start(now); o1.stop(now+.105); o2.stop(now+.105);
      return;
    }

    const freqs = type === 'nav' ? [660, 990] : [880, 1320];
    const g = a.createGain();
    g.gain.setValueAtTime(.0001, now);
    g.gain.exponentialRampToValueAtTime(type==='nav' ? .026 : .032, now+.002);
    g.gain.exponentialRampToValueAtTime(.0001, now+.04);
    g.connect(a.destination);
    freqs.forEach(f=>{
      const o=a.createOscillator();
      o.type='sine'; o.frequency.value=f; o.connect(g); o.start(now); o.stop(now+.042);
    });
  };

  function drawContain(ctx, src, w, h){
    const sw = src.width || src.videoWidth, sh = src.height || src.videoHeight;
    if (!sw || !sh) return;
    const scale = Math.min(w/sw, h/sh);
    const dw = sw*scale, dh = sh*scale;
    const dx = (w-dw)/2, dy=(h-dh)/2;
    ctx.fillStyle='#000';
    ctx.fillRect(0,0,w,h);
    ctx.drawImage(src,0,0,sw,sh,dx,dy,dw,dh);
  }

  // Same N95 processing, but the review image is no longer stretched to the display ratio.
  captureFrame = async function(){
    if(current!=='camera' || reviewMode || video.readyState<2) return;
    clickTone('capture');
    cancelAnimationFrame(camLoop);

    const work=document.createElement('canvas');
    work.width=1296; work.height=972; // 4:3
    const wx=work.getContext('2d',{willReadFrequently:true});
    wx.filter='contrast(1.11) saturate(1.16) brightness(.985)';
    drawCover(wx,video,work.width,work.height);
    wx.filter='none';

    const img=wx.getImageData(0,0,work.width,work.height), d=img.data;
    for(let i=0;i<d.length;i+=4){
      const noise=(Math.random()-.5)*6;
      d[i]=Math.max(0,Math.min(255,d[i]+noise+2));
      d[i+1]=Math.max(0,Math.min(255,d[i+1]+noise));
      d[i+2]=Math.max(0,Math.min(255,d[i+2]+noise-2));
    }
    wx.putImageData(img,0,0);

    const exportCanvas=document.createElement('canvas');
    exportCanvas.width=2592; exportCanvas.height=1944;
    const ex=exportCanvas.getContext('2d');
    ex.imageSmoothingEnabled=true; ex.imageSmoothingQuality='medium';
    ex.drawImage(work,0,0,exportCanvas.width,exportCanvas.height);
    capturedBlob=await new Promise(res=>exportCanvas.toBlob(res,'image/jpeg',.76));

    const preview=camCanvas.getContext('2d');
    preview.imageSmoothingEnabled=true;
    preview.filter='contrast(1.05) saturate(1.08)';
    drawContain(preview,work,camCanvas.width,camCanvas.height);
    preview.filter='none';

    reviewMode=true;
    camBadge.textContent='PHOTO · 5MP';
    updateSofts();
    showCamToast('Photo taken');
  };

  // Make Retake deterministic and restart live preview immediately.
  retakeCamera = function(){
    clickTone('nav');
    reviewMode=false;
    capturedBlob=null;
    camBadge.textContent='N95 · 5MP';
    updateSofts();
    video.play().catch(()=>{});
    startN95Preview();
  };
})();
