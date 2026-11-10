// Translation changes presentation only. The original `text` remains the model input.
export function joinTranslations(posts,translations){
 if(!Array.isArray(translations)||translations.length!==posts.length)throw Error('번역 데이터가 완전하지 않습니다. 전체 번역 파일을 확인해 주세요.');
 const ids=new Set(posts.map(p=>p.id)),map=new Map();
 for(const row of translations){if(!row||!ids.has(row.id)||map.has(row.id)||typeof row.text_ko!=='string'||!row.text_ko.trim())throw Error('번역 ID 중복·누락 또는 빈 문장이 있습니다.');map.set(row.id,row.text_ko);}
 return posts.map(post=>({...post,text_ko:map.get(post.id)}));
}
