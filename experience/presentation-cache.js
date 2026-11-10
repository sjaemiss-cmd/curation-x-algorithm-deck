// Register only after the live feeds have loaded so precaching does not compete
// with the first render. file:// standalone stays entirely self-contained.
(() => {
  const status = document.getElementById('cache-status');
  const button = document.getElementById('prepare-cache');
  if (!status || !button) return;
  if (location.protocol === 'file:') {
    status.textContent = '오프라인 파일 · 자료가 포함되어 있습니다.';
    button.hidden = true;
    return;
  }
  if (!('serviceWorker' in navigator)) {
    status.textContent = '이 브라우저에서는 온라인으로 체험해 주세요.';
    button.hidden = true;
    return;
  }
  let preparation;
  async function prepare() {
    if (preparation) return preparation;
    button.disabled = true;
    status.textContent = '발표 자료 저장 중… 이 탭을 잠시 열어 두세요.';
    preparation = (async () => {
      const registration = await navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'});
      // Offline revisits still verify the already installed cache.
      await registration.update().catch(() => {});
      registration.addEventListener('updatefound', () => {
        registration.installing?.addEventListener('statechange', () => {
          if (registration.waiting) status.textContent = '새 버전이 준비됐습니다. 모든 체험 탭을 닫고 다시 열어 주세요.';
        });
      });
      const ready = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('installation timeout')), 30000);
        const worker = registration.installing;
        const check = () => {
          if (worker?.state === 'redundant') { clearTimeout(timer); reject(Error('installation failed')); }
        };
        worker?.addEventListener('statechange', check);
        check();
        navigator.serviceWorker.ready.then(value => { clearTimeout(timer); resolve(value); });
      });
      if (registration.waiting) {
        status.textContent = '새 버전이 준비됐습니다. 모든 체험 탭을 닫고 다시 열어 주세요.';
      } else {
        const result = await new Promise((resolve, reject) => {
          const channel = new MessageChannel();
          const timer = setTimeout(() => reject(Error('cache timeout')), 15000);
          channel.port1.onmessage = e => { clearTimeout(timer); resolve(e.data); };
          ready.active.postMessage({type: 'CACHE_STATUS'}, [channel.port2]);
        });
        if (!result.ready) throw Error('incomplete cache');
        status.textContent = '발표 준비 완료 · 이 브라우저에 게시글 1만 개와 화면을 저장했습니다.';
        window.presentationCacheReady = true;
      }
      button.textContent = '저장 상태 확인';
    })().catch(() => {
      status.textContent = '자료 저장을 완료하지 못했습니다. 인터넷 연결 후 다시 눌러 주세요.';
    }).finally(() => { preparation = null; button.disabled = false; });
    return preparation;
  }
  button.onclick = prepare;
  const timer = setInterval(() => {
    if (window.comparisonSnapshot?.count === 10000) { clearInterval(timer); prepare(); }
  }, 1000);
  setTimeout(() => clearInterval(timer), 60000);
})();
