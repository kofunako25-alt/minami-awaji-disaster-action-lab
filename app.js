(() => {
  const data = window.WORKSHOP_DATA;
  const byId = Object.fromEntries(data.map(d => [d.id,d]));
  const $ = id => document.getElementById(id);
  const normalize = s => String(s ?? '').normalize('NFKC').trim();
  const colorName = c => c || '未記入';
  let activePage='ideas', shown=30;
  const scenarios=[
    {title:'水や衛生を保つ',desc:'断水・トイレ・入浴・ごみなど',terms:['水','断水','トイレ','汚物','風呂','お風呂','衛生','ごみ','臭','洗濯']},
    {title:'休める環境をつくる',desc:'睡眠・音・寒さ・暑さなど',terms:['眠','睡眠','音','防音','寒','暑','毛布','マット','アイマスク','耳栓','エアコン','環境音']},
    {title:'支援が必要な人に気づく',desc:'高齢者・障害・病気・移動など',terms:['高齢','障害','車椅子','車いす','介護','看護','病気','喘息','声かけ','声をかけ','福祉','歩']},
    {title:'情報や人とのつながりを保つ',desc:'情報・通信・近隣との連携など',terms:['情報','インターネット','SNS','通信','近隣','声かけ','コミュニケーション','行政','連絡','ボランティア']}
  ];
  const optionLabel = (v,label) => `<option value="${esc(v)}">${esc(label)}</option>`;
  function esc(s){return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function setupSelects(){
    $('venue-filter').innerHTML=optionLabel('','すべての会場')+data.map(d=>optionLabel(d.id,d.venue)).join('');
    $('dashboard-venue').innerHTML=data.map(d=>optionLabel(d.id,d.venue)).join('');
    refreshFilters();
  }
  function refreshFilters(){
    const selected=byId[$('venue-filter').value]||data[0], records=selected.records;
    const colors=[...new Set(records.map(r=>colorName(r.color)))].sort();
    $('color-filter').innerHTML=optionLabel('','すべて')+colors.map(x=>optionLabel(x,x)).join('');
    const groups=[...new Set(records.map(r=>normalize(r.group)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja',{numeric:true}));
    $('group-filter').innerHTML=optionLabel('','すべて')+(records.some(r=>!normalize(r.group))?optionLabel('__blank','未記入'): '')+groups.map(x=>optionLabel(x,x==='0'?'未記入/0':`${x}班`)).join('');
    const flows=[...new Set(records.map(r=>normalize(r.flow)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja',{numeric:true}));
    $('flow-filter').innerHTML=optionLabel('','すべて')+(records.some(r=>!normalize(r.flow))?optionLabel('__blank','未記入'): '')+flows.map(x=>optionLabel(x,x==='0'?'未割当（0）':`項目 ${x}`)).join('');
    $('color-help').textContent=selected.venue+'：'+selected.colorHelp;
  }
  function filteredRecords(){
    const venue=$('venue-filter').value, query=normalize($('search').value).toLowerCase(), color=$('color-filter').value,group=$('group-filter').value,flow=$('flow-filter').value;
    return data.filter(d=>!venue||d.id===venue).flatMap(d=>d.records.map(r=>({...r,venue:d.venue,venueId:d.id}))).filter(r=>
      (!query||r.text.toLowerCase().includes(query))&&(!color||colorName(r.color)===color)&&(!group||(group==='__blank'?!normalize(r.group):normalize(r.group)===group))&&(!flow||(flow==='__blank'?!normalize(r.flow):normalize(r.flow)===flow)));
  }
  function card(r){
    let tags=[r.venue,colorName(r.color)];
    if(r.group) tags.push(r.group==='0'?'グループ未記入/0':`グループ ${r.group}`);
    else tags.push('グループ情報なし');
    if(r.flow) tags.push(r.flow==='0'?'項目未割当（0）':`項目 ${r.flow}`); else tags.push('項目情報なし');
    return `<article class="idea-card"><div class="idea-text">${esc(r.text)}</div><div class="idea-meta">${tags.map((t,i)=>`<span class="tag ${i===1?'color-'+esc(colorName(r.color)):''}">${esc(t)}</span>`).join('')}</div></article>`;
  }
  function renderIdeas(){
    const records=filteredRecords(), page=records.slice(0,shown);
    $('idea-count').textContent=`${records.length.toLocaleString('ja-JP')} 件`;
    $('idea-list').innerHTML=page.length?page.map(card).join(''):'<div class="empty">条件に合う記録はありません。検索語や絞り込み条件を変えてください。</div>';
    $('load-more').hidden=records.length<=shown;
  }
  function renderScenarios(){
    $('scenario-options').innerHTML=scenarios.map((s,i)=>`<button class="scenario-option" data-scenario="${i}">${esc(s.title)}<small>${esc(s.desc)}</small></button>`).join('');
    $('scenario-options').addEventListener('click',e=>{const b=e.target.closest('[data-scenario]');if(b)chooseScenario(+b.dataset.scenario);});
  }
  function chooseScenario(i){
    const s=scenarios[i]; document.querySelectorAll('.scenario-option').forEach((b,n)=>b.classList.toggle('selected',n===i));
    const matches=byId.primary.records.filter(r=>s.terms.some(term=>r.text.includes(term))).slice(0,15);
    $('scenario-title').textContent=s.title;
    $('scenario-list').innerHTML=matches.length?matches.map(r=>card({...r,venue:byId.primary.venue,venueId:'primary'})).join(''):'<div class="empty">設定したキーワードに一致する記録はありません。</div>';
  }
  const chartColors=['green','blue','yellow','red','gray'];
  function bars(target, entries, max, emptyText='集計できる記録はありません。'){
    if(!entries.length){$(target).innerHTML=`<p class="chart-sub">${emptyText}</p>`;return;}
    $(target).innerHTML=entries.map(([label,value],i)=>`<div class="bar-row"><span class="bar-label">${esc(label)}</span><div class="bar-track" role="img" aria-label="${esc(label)} ${value}件"><div class="bar-fill ${chartColors[i%chartColors.length]}" style="width:${Math.max(value?1:0,value/max*100)}%"></div></div><span class="bar-value">${value}</span></div>`).join('');
  }
  function flowParts(raw){
    if(!raw)return [];
    const s=normalize(raw);
    if(s==='0')return ['未割当（0）'];
    const parts=s.split(/[、,，\s]+/).filter(Boolean);
    return parts.map(x=>/^\d+$/.test(x)?`項目 ${Number(x)}`:`要確認：${x}`);
  }
  function renderDashboard(){
    const selected=byId[$('dashboard-venue').value]||data[0], all=data.flatMap(d=>d.records.map(r=>({...r,venueId:d.id})));
    $('dashboard-total').textContent=`${selected.records.length} 件（記録行）`;
    bars('chart-venues',data.map(d=>[d.venue,d.records.length]),Math.max(...data.map(d=>d.records.length)));
    const colorCounts={}; selected.records.forEach(r=>{const label=colorName(r.color);colorCounts[label]=(colorCounts[label]||0)+1;});
    const meanings=selected.id==='primary'?{'青':'個人ができる対策','黄':'地域での役割・職能でできる対策'}:selected.id==='elementary'?{'黄':'困りごと','赤':'対策','青':'将来の職業から考えたこと'}:{'赤':'困りごと','黄':'高校生としてできる対策'};
    $('chart-color-sub').textContent=selected.venue+'：'+selected.colorHelp;
    bars('chart-colors',Object.entries(colorCounts).map(([c,n])=>[`${c}：${meanings[c]||'意味未確認'}`,n]),Math.max(1,...Object.values(colorCounts)));
    if(selected.id==='primary'){
      const groups={}; selected.records.forEach(r=>{const k=normalize(r.group)||'未記入';groups[k]=(groups[k]||0)+1;});
      bars('chart-groups',Object.entries(groups).sort((a,b)=>a[0]==='未記入'?1:b[0]==='未記入'?-1:a[0].localeCompare(b[0],'ja',{numeric:true})).map(([k,v])=>[k==='未記入'?k:`${k}班`,v]),Math.max(...Object.values(groups)));
    } else bars('chart-groups',[],1,'この会場の原シートにグループ番号欄はありません。');
    const flows={}; selected.records.forEach(r=>{const parts=flowParts(r.flow);if(!parts.length)flows['未記入']=(flows['未記入']||0)+1;else parts.forEach(k=>flows[k]=(flows[k]||0)+1);});
    const flowEntries=Object.entries(flows).sort((a,b)=>a[0]==='未記入'?1:b[0]==='未記入'?-1:a[0].localeCompare(b[0],'ja',{numeric:true}));
    bars('chart-flow',flowEntries,Math.max(1,...Object.values(flows)));
  }
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{activePage=b.dataset.page;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===`page-${activePage}`));if(activePage==='analysis')renderDashboard();}));
  setupSelects(); renderScenarios(); renderIdeas(); renderDashboard();
  ['search','color-filter','group-filter','flow-filter'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',()=>{shown=30;renderIdeas();}));
  $('venue-filter').addEventListener('change',()=>{refreshFilters();shown=30;renderIdeas();});
  $('clear-filters').addEventListener('click',()=>{$('search').value='';$('venue-filter').value='';refreshFilters();shown=30;renderIdeas();});
  $('load-more').addEventListener('click',()=>{shown+=30;renderIdeas();});
  $('dashboard-venue').addEventListener('change',renderDashboard);
})();

