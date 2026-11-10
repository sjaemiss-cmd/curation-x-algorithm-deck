const frames={'2023':document.getElementById('frame-2023'),'2026':document.getElementById('frame-2026')};
const states={};let selected=null;
function sync(){const data={type:'lab-command',action:'shared',persona:document.getElementById('shared-persona').value,query:document.getElementById('shared-query').value,following:document.getElementById('shared-following').checked};for(const frame of Object.values(frames))frame.contentWindow.postMessage(data,'*');}
function show(){const a=states['2023'],b=states['2026'];if(!a||!b)return;
 const common=Object.keys(a.ranks).filter(id=>Object.hasOwn(b.ranks,id));
 const same=a.count===b.count&&a.ids.every((id,i)=>id===b.ids[i])&&common.length===a.eligible&&common.length===b.eligible&&a.persona===b.persona&&a.query===b.query;
 document.getElementById('same-pool').textContent=same?`${common.length.toLocaleString()}개 동일`:'조건 갱신 중';
 const overlap=a.top.filter(id=>b.top.includes(id)).length;
 document.getElementById('overlap').textContent=`${overlap} / ${Math.min(20,a.eligible,b.eligible)}`;
 document.getElementById('different').textContent=common.filter(id=>a.ranks[id]!==b.ranks[id]).length.toLocaleString()+'개';
 if(selected){document.getElementById('selected-23').textContent=a.ranks[selected]?a.ranks[selected].toLocaleString()+'위':'후보 제외';document.getElementById('selected-26').textContent=b.ranks[selected]?b.ranks[selected].toLocaleString()+'위':'후보 제외';}
 window.comparisonSnapshot={samePool:same,count:common.length,overlap,selected,states};
}
window.addEventListener('message',event=>{
 const era=Object.keys(frames).find(year=>frames[year].contentWindow===event.source);if(!era)return;
 if(event.data?.type==='lab-snapshot'&&event.data.year===era){states[era]=event.data;show();}
 if(event.data?.type==='lab-selected'){selected=event.data.id;document.getElementById('selected-text').textContent=event.data.text;show();}
 if(event.data?.type==='lab-search-request'){document.getElementById('shared-query').scrollIntoView({block:'center'});document.getElementById('shared-query').focus();}
});
document.getElementById('shared-persona').onchange=sync;
document.getElementById('shared-following').onchange=sync;
let timer;document.getElementById('shared-query').oninput=()=>{clearTimeout(timer);timer=setTimeout(sync,120);};
document.getElementById('reset-both').onclick=()=>{document.getElementById('shared-query').value='';document.getElementById('shared-persona').value='balanced';document.getElementById('shared-following').checked=false;selected=null;document.getElementById('selected-text').textContent='어느 화면에서든 ‘왜 이 순위일까?’를 눌러 같은 글을 비교하세요.';document.getElementById('selected-23').textContent='—';document.getElementById('selected-26').textContent='—';for(const frame of Object.values(frames))frame.contentWindow.postMessage({type:'lab-command',action:'reset'},'*');};
