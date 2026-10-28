import {L,COURSES,QUESTIONS,SOURCES,PAIRS,DIMENSIONS,DEFAULT_WEIGHTS,REVIEWED} from './data.mjs';
import {freshState,sanitizeState,normalizedWeights,horizon,coverage,counts,recommend} from './engine.mjs';
const STORAGE='mwi-navigator-v1';
let storageOK=true,state=freshState(),modalCourse=null;
try {state=sanitizeState(JSON.parse(localStorage.getItem(STORAGE)));} catch {storageOK=false;}
const app=document.getElementById('app');
const tr=(de,en)=>state.lang==='en'?en:de;
const t=x=>typeof x==='object'&&x!==null&&'de' in x?x[state.lang]:x;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=x=>esc(t(x));
const paths={
 compass:'<path d="m16.5 7.5-3 6-6 3 3-6Z"/><circle cx="12" cy="12" r="9"/>',
 arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
 spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
 shield:'<path d="m12 3 8 3v5c0 5-4 8-8 10-4-2-8-5-8-10V6Z"/><path d="m8 12 3 3 5-6"/>',
 layers:'<path d="m3 7 9-4 9 4-9 4Zm0 5 9 4 9-4M3 17l9 4 9-4"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 chart:'<path d="M4 3v17h17M8 15v-4m5 4V6m5 9V9"/>',
 check:'<path d="m5 12 4 4L19 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 book:'<path d="M12 5v15M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1Z"/>',
 sliders:'<path d="M4 7h8m4 0h4M4 17h3m4 0h9"/><circle cx="14" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18"/>',
 external:'<path d="M14 3h7v7m0-7L10 14M10 4H4v16h16v-6"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',back:'<path d="M19 12H5m5-5-5 5 5 5"/>'
};
const icon=(name,cls='')=>'<svg class="icon '+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.compass)+'</svg>';
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));storageOK=true;}catch{storageOK=false;}}
function announce(message){document.getElementById('announcer').textContent=message;}
function nav(view){state.view=view;save();render();window.scrollTo({top:0,behavior:'instant'});document.querySelector('main').focus({preventScroll:true});}
function heading(kicker,title,description=''){return '<div class="page-heading"><p class="eyebrow">'+kicker+'</p><h1>'+title+'</h1>'+(description?'<p class="lede">'+description+'</p>':'')+'</div>';}
function button(label,action,cls='primary',extra=''){return '<button class="button '+cls+'" data-action="'+action+'" '+extra+'>'+label+'</button>';}
function badge(label,cls=''){return '<span class="badge '+cls+'">'+label+'</span>';}
function notice(message,kind='info'){return '<div class="notice '+kind+'">'+icon('info')+'<div>'+message+'</div></div>';}
function pills(items){return '<div class="tags">'+items.map(x=>'<span>'+text(x)+'</span>').join('')+'</div>';}
function sourceLinks(ids){return '<div class="source-links">'+ids.map(id=>{const s=SOURCES.find(x=>x.id===id);return '<a href="'+s.url+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+icon('external')+'</a>';}).join('')+'</div>';}
function header(){
 const links=[['home',tr('Übersicht','Overview')],['quiz',tr('Dein Profil','Your profile')],['explore',tr('Spezialisierungen','Specializations')],['results',tr('Dein Ergebnis','Your results')]];
 return '<header class="site-header"><button class="brand" data-action="nav" data-view="home" aria-label="MWI Navigator">'+
 '<span class="brand-mark">'+icon('compass')+'</span><span>MWI<span class="brand-light"> Navigator</span><small>'+tr('FINDE DEINE RICHTUNG','FIND YOUR DIRECTION')+'</small></span></button>'+
 '<nav aria-label="'+tr('Hauptnavigation','Main navigation')+'">'+links.map(([v,label])=>'<button data-action="nav" data-view="'+v+'" class="'+(state.view===v?'active':'')+'" '+(state.view===v?'aria-current="page"':'')+'>'+label+'</button>').join('')+'</nav>'+
 '<div class="lang-switch" aria-label="'+tr('Sprache','Language')+'"><button data-action="lang" data-lang="de" aria-pressed="'+(state.lang==='de')+'">DE</button><span>/</span><button data-action="lang" data-lang="en" aria-pressed="'+(state.lang==='en')+'">EN</button></div></header>';
}
function footer(){return '<footer><div><strong>MWI Navigator</strong><span>'+tr('Eine bewusste Wahl beginnt mit guten Fragen.','An informed choice starts with good questions.')+'</span></div><div class="footer-actions"><button data-action="nav" data-view="evidence">'+tr('Quellen & Methodik','Sources & methodology')+'</button><button data-action="reset">'+tr('Profil zurücksetzen','Reset profile')+'</button></div><p>'+icon('lock')+tr('Deine Antworten bleiben in diesem Browser. Keine Registrierung, kein Tracking.','Your answers stay in this browser. No registration, no tracking.')+(storageOK?'':' '+tr('Speichern ist hier nicht möglich; das Profil bleibt nur bis zum Neuladen erhalten.','Storage is unavailable here; your profile lasts only until reload.'))+'</p><small>'+tr('Unabhängige Orientierungshilfe · kein offizielles Angebot der FH Technikum Wien','Independent guidance tool · not an official FH Technikum Wien service')+' · SS 2027</small></footer>';}
function home(){
 const count=counts(state);
 return '<div class="home-hero"><div class="hero-copy"><p class="eyebrow"><span class="tiny-dot"></span> MASTER WIRTSCHAFTSINFORMATIK <span class="muted">/</span> SS 2027</p>'+
 '<h1>'+tr('Deine Stärken.<br>Deine Zukunft.<br><em>Deine Richtung.</em>','Your strengths.<br>Your future.<br><em>Your direction.</em>')+'</h1>'+
 '<p class="hero-description">'+tr('Welche Spezialisierungen passen zu dir? Entdecke, wo deine Interessen, dein Arbeitsstil und berufliche Chancen zusammenkommen.','Which specializations fit you? Discover where your interests, preferred work and career opportunities come together.')+'</p>'+
 '<div class="hero-actions">'+button(tr(count.visited?'Profil fortsetzen':'Meine Richtung finden',count.visited?'Continue my profile':'Find my direction')+icon('arrow'),'start')+button(tr('Erst einmal umsehen','Explore first')+icon('chevron'),'nav','text-button','data-view="explore"')+'</div>'+
 '<div class="hero-meta"><span>'+icon('clock')+'5–8 '+tr('Minuten','minutes')+'</span><span>'+icon('lock')+tr('Privat in deinem Browser','Private in your browser')+'</span></div></div>'+
 '<div class="direction-card"><div class="direction-top"><span class="eyebrow">'+tr('DEIN PERSÖNLICHER KOMPASS','YOUR PERSONAL COMPASS')+'</span>'+icon('compass')+'</div>'+
 '<div class="compass-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="axis x"></div><div class="axis y"></div><span class="compass-label north">'+tr('INTERESSEN','INTERESTS')+'</span><span class="compass-label south">'+tr('PERSPEKTIVEN','OPPORTUNITIES')+'</span><div class="compass-needle"><span></span></div><div class="compass-center"></div><div class="floating-node node-one">'+icon('spark')+'</div><div class="floating-node node-two">'+icon('chart')+'</div><div class="floating-node node-three">'+icon('shield')+'</div></div>'+
 '<div class="direction-bottom"><span class="mini-symbol">'+icon('sliders')+'</span><p>'+tr('Du bestimmst, was zählt.','You decide what matters.')+'<small>'+tr('Empfehlungen, die deine Prioritäten erklären.','Recommendations that explain your priorities.')+'</small></p></div></div></div>'+
 '<div class="facts-strip"><div><strong>05</strong><span>'+tr('Spezialisierungen','Specializations')+'</span></div><div><strong>02</strong><span>'+tr('Blöcke · je eine Wahl','Blocks · one choice each')+'</span></div><div><strong>20</strong><span>'+tr('Fragen über dich','Questions about you')+'</span></div><div><strong>AT<span class="small-plus">+</span></strong><span>'+tr('Österreich im Fokus, Welt im Blick','Austria first, global context')+'</span></div></div>'+
 '<section class="section"><div class="section-heading"><div><p class="eyebrow">'+tr('VON MÖGLICHKEITEN ZU EINER RICHTUNG','FROM POSSIBILITIES TO A DIRECTION')+'</p><h2>'+tr('Eine Wahl, die zu dir passt.','A choice that fits you.')+'</h2></div><span class="section-note">'+tr('Transparent. Anpassbar. Mit Quellen.','Transparent. Adjustable. With sources.')+'</span></div>'+
 '<div class="how-grid">'+[
 ['01',tr('Lerne dein Profil kennen','Discover your profile'),tr('Was begeistert dich? Welche Aufgaben geben dir Energie? Deine Antworten bilden den Ausgangspunkt.','What interests you? Which tasks energize you? Your answers are the starting point.'),'compass'],
 ['02',tr('Sieh die Möglichkeiten','See the possibilities'),tr('Vergleiche persönliche Passung, Karrierewege und belegte Arbeitsmarkttrends – auch über den Abschluss hinaus.','Compare personal fit, career paths and evidenced market trends—including beyond graduation.'),'layers'],
 ['03',tr('Triff deine eigene Wahl','Make your own choice'),tr('Verändere die Gewichtung, erkunde Alternativen und nimm eine begründete Reihung für beide Blöcke mit.','Adjust the weights, explore alternatives and leave with an explained ranking for both blocks.'),'sliders']
 ].map(([n,title,desc,i])=>'<article class="how-card"><div><span class="step-number">'+n+'</span>'+icon(i)+'</div><h3>'+title+'</h3><p>'+desc+'</p></article>').join('')+'</div></section>'+
 '<section class="section"><div class="section-heading"><div><p class="eyebrow">'+tr('DEINE FÜNF MÖGLICHKEITEN','YOUR FIVE OPTIONS')+'</p><h2>'+tr('Zwei Blöcke. Ein individuelles Profil.','Two blocks. One individual profile.')+'</h2></div>'+button(tr('Alle vergleichen','Compare all')+icon('arrow'),'nav','text-button','data-view="explore"')+'</div><div class="block-overview">'+['2A','2B'].map(block=>'<div><div class="block-label">'+badge(block)+'<span>'+tr('Eine Spezialisierung wählen','Choose one specialization')+'</span></div>'+COURSES.filter(c=>c.block===block).map(c=>'<button class="course-line" data-action="detail" data-id="'+c.id+'"><span class="course-icon" style="--course:'+c.color+'">'+icon(c.icon)+'</span><span><strong>'+esc(c.name)+'</strong><small>'+text(c.subtitle)+'</small></span>'+icon('chevron')+'</button>').join('')+'</div>').join('')+'</div></section>'+
 '<aside class="evidence-banner">'+icon('book')+'<div><strong>'+tr('Orientierung mit Substanz.','Guidance with substance.')+'</strong><p>'+tr('Kursinhalte aus dem MWI-Folder. Berufsperspektiven aus AMS, Cedefop und weiteren Quellen. Prognosen bleiben Einschätzungen.','Course content from the MWI guide. Career perspectives from AMS, Cedefop and other sources. Forecasts remain estimates.')+'</p></div>'+button(tr('Quellen ansehen','View sources')+icon('arrow'),'nav','text-button','data-view="evidence"')+'</aside>';
}
const STEPS=[L('Dein Rahmen','Your context'),L('Deine Interessen','Your interests'),L('Was dich vertieft interessiert','A closer look'),L('Dein Arbeitsstil','Your preferred work'),L('Deine Karriereziele','Your career goals'),L('Dein Startpunkt','Your starting point')];
const STEP_DESCRIPTIONS=[
 L('Ein paar Eckdaten helfen, deine Optionen und den Zeithorizont richtig einzuordnen.','A few details help put your options and time horizon in context.'),
 L('Antworte spontan. Es geht um Neugier, nicht darum, was du schon beherrschst.','Answer intuitively. This is about curiosity, not what you already know.'),
 L('Welche Themen würdest du gern genauer kennenlernen?','Which topics would you like to explore further?'),
 L('Stell dir einen typischen Arbeitstag vor. Welche Tätigkeiten passen zu dir?','Imagine a typical working day. Which activities would fit you?'),
 L('Du musst dich noch nicht festlegen. Bewerte, welche Richtungen dich heute ansprechen.','You do not need to commit yet. Rate the directions that appeal to you today.'),
 L('Vorwissen beeinflusst die Vorbereitung, nicht dein Potenzial.','Prior knowledge affects preparation, not your potential.')
];
function select(name,label,options,value){
 return '<label class="field"><span>'+label+'</span><select data-context="'+name+'" id="context-'+name+'">'+options.map(([v,l])=>'<option value="'+v+'" '+(String(value)===String(v)?'selected':'')+'>'+l+'</option>').join('')+'</select></label>';
}
function contextFields(){
 const c=state.context,h=horizon(c);
 return '<div class="form-grid">'+select('graduation',tr('Voraussichtlicher Masterabschluss','Expected master’s graduation'),Array.from({length:15},(_,i)=>[2026+i,2026+i]),c.graduation)+
 select('mobility',tr('Wo möchtest du arbeiten?','Where would you like to work?'),[['austria',tr('Vor allem Österreich','Mainly Austria')],['dach',tr('Österreich + DACH','Austria + DACH')],['europe',tr('Auch europaweit offen','Also open to Europe')],['global',tr('Auch international offen','Also open internationally')]],c.mobility)+
 select('experience',tr('Dein beruflicher Hintergrund','Your career background'),[['student',tr('Studium / am Berufseinstieg','Studying / starting my career')],['switch',tr('Beruflicher Richtungswechsel','Changing career direction')],['working',tr('Bereits in einem verwandten Bereich tätig','Already working in a related field')]],c.experience)+'</div>'+
 '<div class="horizon-preview">'+icon('globe')+'<div><span>'+tr('Dein Blick nach vorn','Your outlook window')+'</span><strong id="context-horizon">'+h.start+'–'+h.end+'</strong><small>'+tr('2–5 Jahre nach deinem Abschluss','2–5 years after your graduation')+'</small></div></div>'+
 '<fieldset class="field-group"><legend>'+tr('Bereits absolvierte Spezialisierungen','Previously completed specializations')+'</legend><p>'+tr('Auch aus einem Vorstudium. Bereits absolvierte Kurse sind laut Folder nicht erneut wählbar.','Including earlier studies. According to the guide, completed courses cannot be selected again.')+'</p><div class="check-grid">'+COURSES.map(course=>'<label class="check-option"><input type="checkbox" data-completed="'+course.id+'" '+(c.completed.includes(course.id)?'checked':'')+'><span>'+esc(course.name)+'</span>'+badge(course.block)+'</label>').join('')+'</div></fieldset>'+
 '<label class="check-option itba-option"><input type="checkbox" data-context="itba" '+(c.itba?'checked':'')+'><span><strong>'+tr('Ich plane das ITBA Double Degree','I plan to take the ITBA double degree')+'</strong><small>'+tr('Erfordert Mobile Business + Visual Analytics im 2. Semester.','Requires Mobile Business + Visual Analytics in semester 2.')+'</small></span></label>'+
 notice(tr('Alle fünf Kurse werden auf Deutsch unterrichtet und haben Anwesenheitspflicht. Die tatsächliche Zuteilung hängt auch von der Teilnehmer:innenzahl ab.','All five courses are taught in German and require attendance. Actual allocation also depends on participant numbers.'));
}
function ratingQuestion(q,index){
 const answer=state.answers[q.id],labels=[tr('Gar nicht','Not at all'),tr('Eher wenig','A little'),tr('Teils / teils','Somewhat'),tr('Ziemlich','Quite a lot'),tr('Sehr','Very much')];
 return '<fieldset class="question"><legend><span class="question-number">'+String(index+1).padStart(2,'0')+'</span>'+text(q.text)+'</legend><div class="rating-row">'+[1,2,3,4,5].map(v=>'<label class="rating '+(answer===v?'selected':'')+'" title="'+labels[v-1]+'"><input type="radio" id="answer-'+q.id+'-'+v+'" name="'+q.id+'" data-answer="'+q.id+'" value="'+v+'" '+(answer===v?'checked':'')+'><span>'+v+'</span><small>'+labels[v-1]+'</small></label>').join('')+'<label class="rating unsure '+(answer===null?'selected':'')+'"><input type="radio" id="answer-'+q.id+'-unknown" name="'+q.id+'" data-answer="'+q.id+'" value="unknown" '+(answer===null?'checked':'')+'><span>?</span><small>'+tr('Unsicher','Not sure')+'</small></label></div></fieldset>';
}
function readiness(){
 const c=state.context;
 return '<div class="form-grid single">'+select('code',tr('Wie vertraut bist du mit Python oder JavaScript?','How familiar are you with Python or JavaScript?'),[['unknown',tr('Noch nicht sicher','Not sure yet')],['none',tr('Noch keine Kenntnisse','No knowledge yet')],['basic',tr('Grundlagen vorhanden','I know the basics')],['confident',tr('Ich arbeite schon damit','I already use it')]],c.code)+
 select('learning',tr('Wie offen bist du für zusätzliche Vorbereitung?','How open are you to additional preparation?'),[['yes',tr('Gern – ich möchte Neues lernen','Very open—I want to learn')],['some',tr('Etwas Vorbereitung ist möglich','Some preparation is possible')],['no',tr('Aktuell habe ich wenig Spielraum','I have little capacity right now')]],c.learning)+'</div>'+
 '<label class="check-option"><input type="checkbox" data-context="innovation" '+(c.innovation?'checked':'')+'><span>'+tr('Ich habe IT Innovation Management bereits absolviert.','I have already completed IT Innovation Management.')+'</span></label>'+
 notice(tr('Visual Analytics setzt rudimentäre Python- oder JavaScript-Kenntnisse voraus. Für SAP Grundlagen ist kein Vorwissen erforderlich.','Visual Analytics requires rudimentary Python or JavaScript knowledge. SAP Grundlagen requires no prior knowledge.'))+
 '<div class="completion-card"><span class="course-icon">'+icon('check')+'</span><div><h3>'+tr('Bereit für einen neuen Blickwinkel?','Ready for a fresh perspective?')+'</h3><p>'+tr('Dein Ergebnis erklärt die Reihung. Danach kannst du die Gewichtung jederzeit anpassen.','Your results explain the ranking. You can adjust the weights at any time afterwards.')+'</p><small>'+counts(state).answered+'/20 '+tr('inhaltliche Antworten','substantive answers')+'</small></div></div>';
}
function quiz(){
 const selected=state.step===1?QUESTIONS.slice(0,5):state.step===2?QUESTIONS.slice(5,10):state.step===3?QUESTIONS.slice(10,15):QUESTIONS.slice(15,20);
 return '<div class="quiz-shell"><aside class="quiz-sidebar"><p class="eyebrow">'+tr('DEIN PROFIL','YOUR PROFILE')+'</p><h2>'+tr('Schritt für Schritt<br>zu deiner Richtung.','Step by step<br>towards your direction.')+'</h2><ol class="step-list">'+STEPS.map((s,i)=>'<li class="'+(i===state.step?'current':i<state.step?'done':'')+'"><button data-action="step" data-step="'+i+'" '+(i===state.step?'aria-current="step"':'')+'><span>'+(i<state.step?icon('check'):String(i+1).padStart(2,'0'))+'</span>'+text(s)+'</button></li>').join('')+'</ol><div class="sidebar-note">'+icon('lock')+'<p>'+tr('Kein richtig oder falsch.<br>Nur das, was zu dir passt.','No right or wrong.<br>Only what fits you.')+'</p></div></aside>'+
 '<section class="quiz-main"><div class="quiz-progress"><span>'+tr('SCHRITT','STEP')+' '+(state.step+1)+' / 6</span><span>'+counts(state).answered+'/20 '+tr('Antworten','answers')+'</span><div><i style="width:'+((state.step+1)/6*100)+'%"></i></div></div>'+
 heading('',text(STEPS[state.step]),text(STEP_DESCRIPTIONS[state.step]))+
 (state.step===0?contextFields():state.step===5?readiness():'<div class="question-list">'+selected.map(q=>ratingQuestion(q,QUESTIONS.indexOf(q))).join('')+'</div><p class="small muted">'+tr('Unsichere oder ausgelassene Antworten gelten nicht als Ablehnung. Sie reduzieren die Aussagekraft.','Uncertain or skipped answers do not count as dislike. They reduce how much the result can tell you.')+'</p>')+
 '<div class="quiz-controls">'+button(icon('back')+tr('Zurück','Back'),state.step===0?'home':'prev','secondary')+button(tr(state.step===5?'Ergebnis ansehen':'Weiter',state.step===5?'See my results':'Continue')+icon('arrow'),state.step===5?'finish':'next')+'</div></section></div>';
}
function preparation(c){
 const x=state.context,items=[];
 if(c.id==='visual'){
  if(x.code==='none')items.push({type:'warning',label:tr('Vorbereitung notwendig','Preparation needed'),message:tr('Lerne vor Kursbeginn Python- oder JavaScript-Grundlagen.','Learn Python or JavaScript basics before the course starts.')+(x.learning==='no'?' '+tr('Mit wenig Vorbereitungszeit solltest du die Machbarkeit vor der Wahl klären.','With little preparation time, check feasibility before choosing.'):'')});
  else if(x.code==='unknown')items.push({type:'warning',label:tr('Vorkenntnisse prüfen','Check prerequisites'),message:tr('Rudimentäre Python- oder JavaScript-Kenntnisse sind laut Folder notwendig.','Rudimentary Python or JavaScript is necessary according to the guide.')});
  else items.push({type:'success',label:tr('Guter Startpunkt','A useful starting point'),message:tr('Deine angegebenen Programmierkenntnisse passen zur genannten Grundvoraussetzung.','Your reported programming knowledge aligns with the stated basic prerequisite.')});
 }
 if(c.id==='trends'&&!x.innovation)items.push({type:'info',label:tr('Empfohlenes Vorwissen','Recommended background'),message:tr('IT Innovation Management ist hilfreich, laut Folder aber nicht zwingend.','IT Innovation Management is helpful, but not mandatory according to the guide.')});
 if(c.id==='sap')items.push({type:'success',label:tr('Ohne Vorkenntnisse','No prior knowledge needed'),message:tr('Der Kurs beginnt bei den Grundlagen.','The course starts with the foundations.')});
 if(c.id==='audit')items.push({type:'info',label:tr('Kurs ≠ Zertifizierung','Course ≠ certification'),message:tr('CISA-Prüfung und Berufserfahrungsanforderungen gelten separat.','The CISA exam and experience requirements apply separately.')});
 return items.map(i=>'<div class="prep '+i.type+'"><strong>'+i.label+'</strong><p>'+i.message+'</p></div>').join('');
}
function breakdown(r){
 return '<div class="breakdown">'+Object.keys(DIMENSIONS).map(k=>'<div><span>'+text(DIMENSIONS[k])+'</span><div class="mini-bar"><i style="width:'+(r.dimensions[k]??0)+'%"></i></div><b>'+(r.dimensions[k]===null?'—':Math.round(r.dimensions[k]))+'</b></div>').join('')+'</div>';
}
function reasons(r){
 if(r.score===null)return '<p class="small">'+tr('Für eine persönliche Einordnung fehlen Antworten.','Answers are missing for a personal assessment.')+'</p>';
 const answered=QUESTIONS.filter(q=>q.course===r.course.id&&Number.isInteger(state.answers[q.id])).sort((a,b)=>state.answers[b.id]-state.answers[a.id]);
 return '<ul class="reasons">'+answered.slice(0,2).map(q=>'<li>'+icon(state.answers[q.id]>=4?'check':'info')+'<span>'+text(q.text)+' <strong>'+state.answers[q.id]+'/5</strong></span></li>').join('')+'<li>'+icon('globe')+'<span>'+tr('Berufsperspektive:','Career outlook:')+' '+text(r.course.market.confidence)+' '+tr('Evidenzvertrauen;','evidence confidence;')+' '+tr('Gewichtung','weight')+' '+Math.round(r.contributions.find(c=>c.key==='market')?.weight||0)+'%.</span></li></ul>';
}
function resultCard(r,rank,top){
 const c=r.course,close=r.score!==null&&top!==null&&rank>0&&Math.abs(top-r.score)<=3;
 return '<article class="result-card" style="--course:'+c.color+'"><div class="result-card-top"><div class="course-icon">'+icon(c.icon)+'</div><div><span class="eyebrow">'+(r.score===null?tr('NOCH OFFEN','STILL OPEN'):tr('PRÄFERENZ','PREFERENCE')+' '+(rank+1))+'</span><h3>'+esc(c.name)+'</h3></div><div class="score">'+(r.score===null?'—':Math.round(r.score))+'<small>/ 100</small></div></div>'+
 (close?badge(tr('Nahe Alternative · ≤ 3 Punkte','Close alternative · ≤ 3 points'),'amber'):'')+
 (r.answered<r.total?'<p class="small amber-text">'+r.answered+'/'+r.total+' '+tr('Antworten · vorläufige Einordnung','answers · tentative assessment')+'</p>':'')+
 breakdown(r)+'<details><summary>'+tr('Warum diese Einordnung?','Why this assessment?')+'</summary>'+reasons(r)+'<p class="small"><strong>'+tr('Abwägung: ','Tradeoff: ')+'</strong>'+esc(t(c.tradeoffs)[0])+'</p></details>'+
 preparation(c)+'<div class="result-card-footer">'+button(tr('Kurs & Karrierewege','Course & career paths')+icon('arrow'),'detail','text-button','data-id="'+c.id+'"')+'</div></article>';
}
function weightsPanel(){
 const weights=normalizedWeights(state.weights);
 return '<aside class="weights-panel"><div class="panel-title">'+icon('sliders')+'<h3>'+tr('Was zählt für dich?','What matters to you?')+'</h3></div><p>'+tr('Verändere deine Prioritäten. Deine Reihung passt sich direkt an.','Adjust your priorities. Your ranking updates immediately.')+'</p><div class="presets">'+[['balanced',tr('Ausgewogen','Balanced')],['fit',tr('Passung','Personal fit')],['career',tr('Berufschancen','Career outlook')]].map(([id,label])=>'<button data-action="preset" data-preset="'+id+'">'+label+'</button>').join('')+'</div>'+
 Object.keys(weights).map(k=>'<label class="weight-row" for="weight-'+k+'"><span>'+text(DIMENSIONS[k])+'<output id="weight-output-'+k+'">'+Math.round(weights[k])+'%</output></span><input type="range" id="weight-'+k+'" data-weight="'+k+'" min="0" max="100" step="1" value="'+state.weights[k]+'"></label>').join('')+
 '<p class="small">'+tr('Relative Gewichtung, automatisch auf 100 % normiert. Sind alle Regler null, gilt „Ausgewogen“. Fehlende Dimensionen werden pro Kurs ausgelassen.','Relative weights, normalized to 100%. If all sliders are zero, Balanced applies. Missing dimensions are omitted per course.')+'</p>'+
 '<div class="weights-divider"></div><strong class="small">'+tr('Dein Zeithorizont','Your time horizon')+'</strong><p class="horizon-small">'+horizon(state.context).start+'–'+horizon(state.context).end+'</p><span class="small muted">'+tr('2–5 Jahre nach Abschluss','2–5 years after graduation')+'</span>'+button(tr('Rahmen ändern','Edit context'),'edit-context','text-button')+'</aside>';
}
function resultContent(){
 const rec=recommend(state),h=horizon(state.context);
 let html='';
 if(!rec.ready)html+=notice(tr('Für eine persönliche Reihung brauchen wir mindestens eine inhaltliche Antwort zu Interessen, Arbeitsstil und Karrierezielen. Ergänze dein Profil; die Kursübersicht bleibt frei zugänglich.','For a personal ranking, we need at least one substantive answer about interests, preferred work and career goals. Complete your profile; course exploration remains available.'),'warning')+button(tr('Profil ergänzen','Complete profile')+icon('arrow'),'start');
 if(rec.conflict)html+=notice(tr('ITBA-Konflikt: Mobile Business oder Visual Analytics wurde als bereits absolviert markiert. Laut Folder ist die Kombination erforderlich, Wiederholung aber ausgeschlossen. Bitte mit dem Studiengang klären.','ITBA conflict: Mobile Business or Visual Analytics is marked as already completed. The guide requires this combination but excludes retaking completed courses. Please clarify with the programme.'),'warning');
 if(rec.recommended){
  const p=rec.recommended;
  html+='<section class="pair-recommendation"><div class="pair-eyebrow">'+icon('compass')+'<span>'+tr(state.context.itba?'DEINE VORGESCHRIEBENE ITBA-KOMBINATION':'DEINE EMPFOHLENE KOMBINATION',state.context.itba?'YOUR REQUIRED ITBA COMBINATION':'YOUR RECOMMENDED COMBINATION')+'</span></div><div class="pair-names"><div>'+badge('2A')+'<h2>'+text(p.a.course.short)+'</h2></div><span class="pair-plus">+</span><div>'+badge('2B')+'<h2>'+text(p.b.course.short)+'</h2></div></div><p>'+text(PAIRS[p.id])+'</p><div class="pair-bottom"><span>'+tr(state.context.itba?'Programmregel, unabhängig vom Fit-Score.':'Eine Orientierung anhand deiner aktuellen Antworten.',state.context.itba?'Programme requirement, independent of fit scores.':'Guidance based on your current answers.')+'</span>'+(p.score===null?'':'<strong>'+Math.round(p.score)+'<small> / 100</small></strong>')+'</div></section>';
 }
 if(h.end>2035)html+=notice(tr('Dein Zeitraum reicht über 2035 hinaus. Die Berufsperspektive wird deshalb aus der Wertung genommen; aktuelle Marktdaten bleiben als Kontext sichtbar.','Your window extends beyond 2035. Career outlook is therefore excluded from scoring; current market evidence remains visible as context.'),'warning');
 else html+=notice(tr('Blick auf '+h.start+'–'+h.end+': AMS endet 2028, globale WEF-Erwartungen 2030. Cedefop reicht bis 2035, aber nur auf breiter Berufsebene. Die Marktnote ist eine heutige Einschätzung, keine Prognose für deinen Abschlussjahrgang.','Looking at '+h.start+'–'+h.end+': AMS ends in 2028, global WEF expectations in 2030. Cedefop reaches 2035 at a broad occupational level. The market rating is a current judgment, not a forecast for your graduating class.'));
 html+='<div class="ranked-blocks">'+['2A','2B'].map(block=>{
  const rs=rec.ranked[block],top=rs.find(x=>x.score!==null)?.score??null;
  return '<section><div class="block-title">'+badge(block)+'<h2>'+tr('Deine Reihung','Your ranking')+'</h2><span>'+tr('eine Wahl','one choice')+'</span></div>'+
  (rs.length?rs.map((r,i)=>resultCard(r,i,top)).join(''):notice(tr('Keine wählbare Spezialisierung in diesem Block. Bitte frühere Abschlüsse und Wahlmöglichkeiten mit dem Studiengang klären.','No eligible specialization in this block. Please clarify prior completions and available options with the programme.'),'warning'))+
  (state.context.itba?'<p class="small muted">'+tr('ITBA-Vorgabe hat Vorrang vor dieser persönlichen Reihung.','The ITBA requirement takes precedence over this personal ranking.')+'</p>':'')+'</section>';
 }).join('')+'</div>';
 if(state.context.completed.length)html+='<p class="small muted">'+tr('Nicht erneut wählbar: ','Not eligible to retake: ')+state.context.completed.map(id=>esc(COURSES.find(c=>c.id===id).name)).join(', ')+'.</p>';
 html+='<section class="next-actions"><p class="eyebrow">'+tr('VOM ERGEBNIS ZUM NÄCHSTEN SCHRITT','FROM YOUR RESULT TO YOUR NEXT STEP')+'</p><h2>'+tr('Probiere deine Richtung aus.','Try out your direction.')+'</h2>'+
 (rec.recommended?[rec.recommended.a.course,rec.recommended.b.course].map(c=>'<div class="action-item"><span class="course-icon" style="--course:'+c.color+'">'+icon(c.icon)+'</span><div><h3>'+esc(c.name)+'</h3><p>'+text(c.action)+'</p></div></div>').join(''):'<p>'+tr('Ergänze dein Profil oder erkunde die Kursdetails für konkrete Lernprojekte.','Complete your profile or explore course details for practical learning projects.')+'</p>')+
 '<p class="small">'+tr(state.context.experience==='working'?'Nutze möglichst eine Fragestellung aus deiner aktuellen Arbeit.':state.context.experience==='switch'?'Verbinde ein kleines Projekt mit deinem bisherigen Branchenwissen.':'Nutze ein kleines Portfolio-Projekt, Praktikum oder Gespräch mit Berufseinsteiger:innen, um deine Annahmen zu testen.',state.context.experience==='working'?'Use a question from your current work where possible.':state.context.experience==='switch'?'Connect a small project to your existing industry knowledge.':'Use a small portfolio project, internship or conversation with recent entrants to test your assumptions.')+'</p></section>'+
 '<details class="all-pairs"><summary>'+tr('Alle sechs Kombinationen erkunden','Explore all six combinations')+'</summary><div class="pair-grid">'+rec.pairs.map(p=>'<article class="'+(!p.eligible?'excluded':'')+'"><div>'+badge('2A + 2B')+'<strong>'+(p.score===null?'—':Math.round(p.score)+'/100')+'</strong></div><h3>'+text(p.a.course.short)+' + '+text(p.b.course.short)+'</h3><p>'+text(PAIRS[p.id])+'</p>'+(!p.eligible?badge(tr('Bereits absolvierter Kurs enthalten','Includes a completed course'),'amber'):state.context.itba&&!p.required?badge(tr('Erfüllt ITBA-Vorgabe nicht','Does not meet ITBA requirement'),'amber'):p.required?badge(tr('ITBA-Kombination','ITBA combination')):'')+'</article>').join('')+'</div></details>'+
 '<p class="small muted score-note">'+tr('Scores sind vergleichende Orientierung, keine Eignungsdiagnose oder Beschäftigungswahrscheinlichkeit. Paar-Score = Mittelwert beider Kurse. Die Zuteilung erfolgt durch den Studiengang.','Scores offer comparative guidance, not an aptitude diagnosis or probability of employment. Pair score = mean of both courses. The programme determines allocation.')+'</p>'+
 '<div class="print-extra"><h3>'+tr('Gewichtung & Grundlagen','Weights & basis')+'</h3><p>'+Object.entries(normalizedWeights(state.weights)).map(([k,v])=>text(DIMENSIONS[k])+': '+Math.round(v)+'%').join(' · ')+'</p><p>'+tr('Evidenz geprüft am ','Evidence reviewed ')+REVIEWED+' · MWI Folder SS2027</p></div>';
 return html;
}
function results(){
 return heading(tr('DEINE ANTWORTEN. DEINE PRIORITÄTEN.','YOUR ANSWERS. YOUR PRIORITIES.'),tr('Hier könnte es für dich weitergehen.','Here is where you could go next.'),tr('Eine begründete Reihung – und genug Raum für deine eigene Entscheidung.','An explained ranking—with room for your own decision.'))+
 '<div class="results-toolbar"><span>'+counts(state).answered+'/20 '+tr('Fragen beantwortet','questions answered')+'</span><div>'+button(icon('sliders')+tr('Antworten bearbeiten','Edit answers'),'start','secondary')+button(icon('download')+tr('Ergebnis drucken / PDF','Print / save PDF'),'print','secondary')+'</div></div>'+
 '<div class="results-layout"><div id="result-content">'+resultContent()+'</div>'+weightsPanel()+'</div>';
}
function courseCard(c){
 const selected=state.compare.includes(c.id),r=recommend(state).results.find(x=>x.course.id===c.id);
 return '<article class="explore-card" style="--course:'+c.color+'"><div class="explore-card-top"><span class="course-icon">'+icon(c.icon)+'</span>'+badge(c.block)+'</div><h2>'+esc(c.name)+'</h2><p class="course-tagline">'+text(c.subtitle)+'</p><p>'+text(c.description)+'</p>'+pills(c.tags)+'<div class="course-card-score">'+tr('Dein Score','Your score')+'<strong>'+(r.score===null?'—':Math.round(r.score)+'/100')+'</strong></div>'+
 (!r.eligible?badge(tr('Bereits absolviert','Already completed'),'amber'):'')+'<div class="explore-card-actions">'+button(tr('Details','Details')+icon('arrow'),'detail','text-button','data-id="'+c.id+'"')+'<label class="compare-toggle"><input type="checkbox" data-compare="'+c.id+'" '+(selected?'checked':'')+' '+(!selected&&state.compare.length>=3?'disabled':'')+'>'+tr('Vergleichen','Compare')+'</label></div></article>';
}
function comparison(){
 if(!state.compare.length)return '';
 const selected=state.compare.map(id=>COURSES.find(c=>c.id===id));
 return '<section class="comparison-section"><div class="section-heading"><div><p class="eyebrow">'+tr('DEIN DIREKTVERGLEICH','YOUR SIDE-BY-SIDE COMPARISON')+'</p><h2>'+tr('Was unterscheidet deine Optionen?','What sets your options apart?')+'</h2></div>'+button(tr('Auswahl leeren','Clear selection'),'clear-compare','text-button')+'</div><div class="comparison-grid" style="--cols:'+selected.length+'">'+selected.map(c=>'<article style="--course:'+c.color+'"><h3>'+esc(c.name)+'</h3>'+badge(c.block)+'<h4>'+tr('Das lernst du','What you learn')+'</h4><ul>'+t(c.topics).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><h4>'+tr('Mögliche Einstiegspfade','Possible entry routes')+'</h4><p>'+t(c.roles).map(esc).join(' · ')+'</p><h4>'+tr('Voraussetzungen','Prerequisites')+'</h4><p>'+text(c.prerequisite)+'</p><h4>'+tr('Abwägungen','Tradeoffs')+'</h4><ul>'+t(c.tradeoffs).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><h4>'+tr('Berufsperspektive','Career outlook')+'</h4><p>'+text(c.outlook)+'</p>'+sourceLinks(c.market.sources.slice(0,1))+'</article>').join('')+'</div></section>';
}
function explore(){
 return heading(tr('FÜNF WEGE, VIELE MÖGLICHKEITEN','FIVE PATHS, MANY POSSIBILITIES'),tr('Entdecke deine Optionen.','Explore your options.'),tr('Lerne die Inhalte und beruflichen Richtungen kennen. Wähle bis zu drei Kurse für den direkten Vergleich.','Get to know the content and career directions. Select up to three courses to compare side by side.'))+
 '<div class="explore-toolbar"><div class="filter-group" aria-label="'+tr('Spezialisierungsblock','Specialization block')+'">'+[['all',tr('Alle fünf','All five')],['2A','Block 2A'],['2B','Block 2B']].map(([id,label])=>'<button data-action="filter" data-filter="'+id+'" aria-pressed="'+(state.filter===id)+'">'+label+'</button>').join('')+'</div><span class="small muted">'+state.compare.length+'/3 '+tr('zum Vergleich ausgewählt','selected for comparison')+'</span></div>'+
 '<div class="explore-grid">'+COURSES.filter(c=>state.filter==='all'||c.block===state.filter).map(courseCard).join('')+'</div>'+comparison()+
 notice(tr('Pro Block ist eine Spezialisierung zu wählen. Alle Kurse: Deutsch und Anwesenheitspflicht. Bereits absolvierte Kurse können nicht erneut gewählt werden. Anrechnungen sind laut Folder nicht möglich; Inhalte können sich ändern.','Choose one specialization per block. All courses: German instruction and compulsory attendance. Previously completed courses cannot be retaken. The guide excludes credit recognition and notes that content may change.'))+
 (!counts(state).answered?'<div class="explore-cta"><h2>'+tr('Und welcher Weg passt zu dir?','And which path fits you?')+'</h2>'+button(tr('Mein Profil entdecken','Discover my profile')+icon('arrow'),'start')+'</div>':'');
}
function evidence(){
 const h=horizon(state.context);
 const statusLabels={covered:tr('Deckt Zeitraum ab · breite Ebene','Covers window · broad level'),partial:tr('Deckt Zeitraum teilweise ab','Partly covers window'),outside:tr('Außerhalb deines Zielzeitraums','Outside your target window'),context:tr('Kontext, keine zeitliche Prognose','Context, not a time-bound forecast')};
 return heading(tr('QUELLEN & METHODIK','SOURCES & METHODOLOGY'),tr('Eine Empfehlung, die du nachvollziehen kannst.','A recommendation you can understand.'),tr('Kursfakten, Arbeitsmarktevidenz und unsere Interpretation werden getrennt ausgewiesen.','Course facts, labour-market evidence and our interpretation are shown separately.'))+
 '<div class="evidence-summary"><div><span class="eyebrow">'+tr('GEPRÜFT AM','REVIEWED')+'</span><strong>22.10.2026</strong></div><div><span class="eyebrow">'+tr('DEIN ZEITRAUM','YOUR WINDOW')+'</span><strong>'+h.start+'–'+h.end+'</strong></div><div><span class="eyebrow">'+tr('DATENSTAND','DATA APPROACH')+'</span><strong>'+tr('Kuratierte Momentaufnahme','Curated snapshot')+'</strong></div></div>'+
 '<section class="method-section"><h2>'+tr('So entsteht deine Reihung','How your ranking works')+'</h2><div class="method-grid"><article><span class="method-number">01</span><h3>'+tr('Deine Antworten','Your answers')+'</h3><p>'+tr('Je Kurs: zwei Interessenfragen, eine Frage zum Arbeitsstil und eine zum Karriereziel. Antworten 1–5 werden auf 0, 25, 50, 75, 100 abgebildet. Die beiden Interessenwerte werden gemittelt.','Per course: two interest questions, one work-style question and one career question. Responses 1–5 map to 0, 25, 50, 75, 100. The two interest values are averaged.')+'</p></article><article><span class="method-number">02</span><h3>'+tr('Deine Prioritäten','Your priorities')+'</h3><p>'+tr('Standard: 40 % Interessen, 20 % Arbeitsstil, 15 % Karriereziele, 25 % Berufsperspektive. Der Score ist der gewichtete Mittelwert. Alle Gewichte sind veränderbar.','Default: 40% interests, 20% work style, 15% career goals, 25% career outlook. The score is the weighted mean. All weights are adjustable.')+'</p></article><article><span class="method-number">03</span><h3>'+tr('Regeln & Grenzen','Rules & limits')+'</h3><p>'+tr('Bereits absolvierte Kurse entfallen. ITBA hat eine Pflichtkombination. Fehlende Antworten werden ausgelassen, die übrigen Gewichte neu normiert. Wenige Antworten machen Vergleiche unsicherer; ein Kurs ohne persönliche Antwort erhält keinen Score.','Completed courses are excluded. ITBA has a required combination. Missing answers are omitted and remaining weights renormalized. Fewer answers make comparison less reliable; a course with no personal answer receives no score.')+'</p></article></div>'+
 '<p class="small">'+tr('Eine persönliche Reihung benötigt mindestens eine Antwort in jeder persönlichen Dimension. Kurse mit höchstens drei Punkten Abstand zum Spitzenwert des Blocks werden als nahe Alternativen markiert. Paare verwenden den Mittelwert beider Kurse ohne Bonus. Bei identischen Scores dient die Reihenfolge im Folder nur der stabilen Anzeige.','A personal ranking needs at least one answer in each personal dimension. Courses within three points of their block’s leader are marked as close alternatives. Pairs use the mean of the two courses, without a bonus. For identical scores, guide order only keeps the display stable.')+'</p>'+
 '<details><summary>'+tr('Fragen und Kurszuordnung ansehen','Inspect questions and course mapping')+'</summary><div class="mapping-list">'+QUESTIONS.map(q=>'<div><span>'+esc(q.id.toUpperCase())+'</span><p>'+text(q.text)+'</p><small>'+esc(COURSES.find(c=>c.id===q.course).name)+' · '+text(DIMENSIONS[q.dimension])+'</small></div>').join('')+'</div></details></section>'+
 '<section class="method-section"><h2>'+tr('Was die Berufsperspektive bedeutet','What career outlook means')+'</h2><p>'+tr('Redaktionelle Einschätzung verwandter Berufspfade, keine gemessene Wirkung eines Kurses. Drei gleich gewichtete Faktoren: heutige Nachfrage, längerfristige Treiber und Einstiegsmöglichkeiten. Die Marktnote ist ihr Mittelwert × 20. Evidenzvertrauen beschreibt die Güte der Quellen und ihrer Zuordnung, nicht die Sicherheit einer Beschäftigung.','An editorial assessment of related career paths, not the measured effect of a course. Three equally weighted factors: current demand, longer-term drivers and entry accessibility. Market score is their mean × 20. Evidence confidence describes source quality and mapping, not certainty of employment.')+'</p>'+
 '<div class="rubric-table"><table><caption>'+tr('Fünfstufige Rubrik für die redaktionelle Einschätzung','Five-level rubric for editorial assessments')+'</caption><thead><tr><th>'+tr('Wert','Rating')+'</th><th>'+tr('Nachfrage','Demand')+'</th><th>'+tr('Treiber','Drivers')+'</th><th>'+tr('Einstieg','Entry')+'</th></tr></thead><tbody>'+
 [
 [1,tr('Schwach','Weak'),tr('Überwiegend ungünstig','Predominantly adverse'),tr('Sehr hohe Hürden','Substantial barriers')],
 [2,tr('Eher schwach','Somewhat weak'),tr('Eher ungünstig','Somewhat adverse'),tr('Erhebliche Zusatzpraxis','Significant additional practice')],
 [3,tr('Gemischt','Mixed'),tr('Gemischt / begrenzt','Mixed / limited'),tr('Mit Vorbereitung plausibel','Plausible with preparation')],
 [4,tr('Relativ stark','Relatively strong'),tr('Günstige strukturelle Hinweise','Favorable structural signals'),tr('Dokumentierte Junior-Pfade','Documented junior pathways')],
 [5,tr('Außergewöhnlich stark','Exceptionally strong'),tr('Starke, konsistente Unterstützung','Strong, consistent support'),tr('Breit zugänglich mit Qualifikation','Broad access with qualification')]
 ].map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+
 '<p class="small">'+tr('Unbekannt ist nicht null: Fehlende Evidenz wird ausgelassen. Endet dein Zielzeitraum nach 2035, entfällt die gesamte Marktdimension aus der Wertung. Sonst bleiben die heutigen Einschätzungen gleich; es werden keine jährlichen Prognosen erfunden.','Unknown is not zero: missing evidence is omitted. If your target window ends after 2035, the entire market dimension is excluded from scoring. Otherwise current judgments remain the same; annual forecasts are not invented.')+'</p>'+
 '<div class="market-assessments">'+COURSES.map(c=>'<details><summary>'+esc(c.name)+'<span class="assessment-rating">'+c.market.ratings.join(' / ')+' · '+text(c.market.confidence)+'</span></summary><p class="small">'+tr('Nachfrage / Treiber / Einstieg · Evidenzvertrauen','Demand / drivers / entry · evidence confidence')+'</p><ol>'+t(c.market.rationale).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>'+sourceLinks(c.market.sources)+'</details>').join('')+'</div></section>'+
 '<section class="method-section"><h2>'+tr('Österreich im Fokus. Darüber hinaus informiert.','Austria first. Informed beyond it.')+'</h2><p>'+tr('Der numerische Marktblick bleibt auf Österreich bezogen. Deine Mobilitätsauswahl verändert den ergänzenden regionalen Kontext, nicht automatisch den Score: Die nationalen Daten sind nicht ausreichend vergleichbar für künstliche Länder-Ranglisten.','The numerical market view stays focused on Austria. Your mobility selection changes the additional regional context, not automatically the score: national data are not sufficiently comparable for artificial country rankings.')+'</p>'+regionalContext()+'</section>'+
 '<section class="sources-section"><div class="section-heading"><h2>'+tr('Die Quellen im Detail','Sources in detail')+'</h2><span class="small muted">'+tr('Links öffnen die Originalquelle','Links open the original source')+'</span></div><div class="source-list">'+SOURCES.map(s=>'<article><div class="source-top"><span class="eyebrow">'+text(s.region)+'</span>'+badge(statusLabels[coverage(s.until,state.context)],coverage(s.until,state.context)==='outside'?'amber':'')+'</div><h3><a href="'+s.url+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+icon('external')+'</a></h3><p>'+text(s.note)+'</p><div class="source-meta"><span>'+text(s.type)+'</span><span>'+text(s.date)+'</span></div></article>').join('')+'</div></section>'+
 notice(tr('Der Folder nennt SS2027, obwohl sein Dateiname SS2026 enthält. Kursumfang in Stunden, genaue Prüfungsmethoden und SAP-Systemversion sind nicht angegeben. Bitte aktuelle Details beim Studiengang prüfen. Alle in der App genannten Rollen und Lernprojekte sind ergänzende Einordnungen.','The guide says SS2027 although its filename contains SS2026. Workload hours, detailed assessment methods and SAP system version are unspecified. Check current details with the programme. Roles and learning projects in this app are additional interpretations.'));
}
function regionalContext(){
 const mobility=state.context.mobility;
 const ids=mobility==='austria'?['ams-it']:mobility==='dach'?['ba','seco']:mobility==='europe'?['ba','seco','cedefop']:['ba','seco','cedefop','wef'];
 return '<div class="region-cards">'+ids.map(id=>{const s=SOURCES.find(x=>x.id===id);return '<article><span class="eyebrow">'+text(s.region)+'</span><p>'+text(s.note)+'</p><a href="'+s.url+'" target="_blank" rel="noopener noreferrer">'+tr('Originalquelle','Original source')+icon('external')+'</a></article>';}).join('')+'</div>';
}
function modalContent(c){
 const r=recommend(state).results.find(x=>x.course.id===c.id);
 return '<button class="modal-close" data-action="close-modal" aria-label="'+tr('Schließen','Close')+'">'+icon('close')+'</button><div class="course-icon" style="--course:'+c.color+'">'+icon(c.icon)+'</div><p class="eyebrow">BLOCK '+c.block+' · '+tr('FOLDER S. ','GUIDE P. ')+c.page+'</p><h2 id="dialog-title">'+esc(c.name)+'</h2><p class="modal-subtitle">'+text(c.subtitle)+'</p><p>'+text(c.description)+'</p>'+pills(c.tags)+
 '<div class="detail-grid"><section><h3>'+tr('Das lernst du','What you learn')+'</h3><ul>'+t(c.topics).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section><section><h3>'+tr('Mögliche Einstiegspfade','Possible entry routes')+'</h3><ul>'+t(c.roles).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><p class="small muted">'+text(c.later)+'</p></section></div>'+
 '<h3>'+tr('Voraussetzungen & Vorbereitung','Prerequisites & preparation')+'</h3><p>'+text(c.prerequisite)+'</p>'+preparation(c)+
 (r.score===null?'':'<h3>'+tr('Deine Passung im Detail','Your fit in detail')+'</h3>'+breakdown(r)+reasons(r))+
 '<h3>'+tr('Was du abwägen solltest','Tradeoffs to consider')+'</h3><ul>'+t(c.tradeoffs).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
 '<h3>'+tr('Berufsperspektive','Career outlook')+'</h3><p>'+text(c.outlook)+'</p><p class="small"><strong>'+tr('Evidenzvertrauen: ','Evidence confidence: ')+text(c.market.confidence)+'</strong> · '+tr('Berufsgruppen als Näherung, keine Kursprognose.','Occupations used as proxies, not a course forecast.')+'</p>'+sourceLinks(c.market.sources)+
 '<h3>'+tr('KI & übertragbare Kompetenzen','AI & transferable skills')+'</h3><p>'+text(c.ai)+'</p><p>'+text(c.mobility)+'</p><p class="small muted">'+tr('Diese Einordnung ist eine qualitative Interpretation, keine Vorhersage sicherer oder unsicherer Berufe.','This is a qualitative interpretation, not a prediction of safe or unsafe occupations.')+'</p>'+
 '<div class="detail-action"><h3>'+tr('Ein guter nächster Schritt','A useful next step')+'</h3><p>'+text(c.action)+'</p></div>'+
 '<p class="small muted">'+tr('Kursfakten: bereitgestellter MWI-Folder SS2027, S. ','Course facts: supplied MWI guide SS2027, p. ')+c.page+tr('. Alle Kurse: Deutsch und Anwesenheitspflicht. Inhalte können sich ändern.','. All courses: German instruction and compulsory attendance. Content may change.')+'</p>';
}
function openDetail(id){
 const c=COURSES.find(x=>x.id===id);if(!c)return;
 modalCourse=id;const d=document.getElementById('course-dialog');d.innerHTML=modalContent(c);d.showModal();
}
function render(focusId){
 document.documentElement.lang=state.lang;
 document.title=tr('MWI Navigator · Deine Richtung finden','MWI Navigator · Find your direction');
 const views={home,quiz,results,explore,evidence};
 app.innerHTML=header()+'<main id="main" tabindex="-1" class="view-'+state.view+'">'+views[state.view]()+'</main>'+footer()+'<dialog id="course-dialog" aria-labelledby="dialog-title"></dialog><dialog id="reset-dialog" class="confirm-dialog" aria-labelledby="reset-title"><h2 id="reset-title">'+tr('Neu anfangen?','Start again?')+'</h2><p>'+tr('Deine Antworten, Prioritäten und Kursauswahl werden aus diesem Browser gelöscht.','Your answers, priorities and course selection will be removed from this browser.')+'</p><div>'+button(tr('Abbrechen','Cancel'),'cancel-reset','secondary')+button(tr('Profil zurücksetzen','Reset profile'),'confirm-reset')+'</div></dialog>';
 if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
}
app.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b)return;
 const action=b.dataset.action;
 if(action==='nav')return nav(b.dataset.view);
 if(action==='home')return nav('home');
 if(action==='lang'){state.lang=b.dataset.lang;save();render();return;}
 if(action==='start')return nav('quiz');
 if(action==='step'){state.step=+b.dataset.step;return nav('quiz');}
 if(action==='next'||action==='prev'){state.step+=action==='next'?1:-1;return nav('quiz');}
 if(action==='finish')return nav('results');
 if(action==='edit-context'){state.step=0;return nav('quiz');}
 if(action==='detail')return openDetail(b.dataset.id);
 if(action==='close-modal'){document.getElementById('course-dialog').close();modalCourse=null;return;}
 if(action==='print'){window.print();return;}
 if(action==='filter'){state.filter=b.dataset.filter;save();render();return;}
 if(action==='clear-compare'){state.compare=[];save();render();return;}
 if(action==='preset'){
  state.weights=b.dataset.preset==='fit'?{interest:55,work:25,career:15,market:5}:b.dataset.preset==='career'?{interest:20,work:10,career:20,market:50}:{...DEFAULT_WEIGHTS};save();render();announce(tr('Reihung aktualisiert.','Ranking updated.'));return;
 }
 if(action==='reset'){document.getElementById('reset-dialog').showModal();return;}
 if(action==='cancel-reset'){document.getElementById('reset-dialog').close();return;}
 if(action==='confirm-reset'){const lang=state.lang;state=freshState();state.lang=lang;save();nav('home');return;}
});
app.addEventListener('change',e=>{
 const el=e.target;
 if(el.dataset.answer){state.answers[el.dataset.answer]=el.value==='unknown'?null:Number(el.value);save();render(el.id);return;}
 if(el.dataset.context){
  const key=el.dataset.context;state.context[key]=el.type==='checkbox'?el.checked:key==='graduation'?Number(el.value):el.value;
  save();const hp=document.getElementById('context-horizon');if(hp)hp.textContent=horizon(state.context).start+'–'+horizon(state.context).end;return;
 }
 if(el.dataset.completed){
  const id=el.dataset.completed;state.context.completed=el.checked?[...new Set([...state.context.completed,id])]:state.context.completed.filter(x=>x!==id);save();return;
 }
 if(el.dataset.compare){
  const id=el.dataset.compare;if(el.checked&&state.compare.length<3)state.compare.push(id);else state.compare=state.compare.filter(x=>x!==id);save();render();announce(state.compare.length+'/3 '+tr('Kurse ausgewählt','courses selected'));return;
 }
 if(el.dataset.weight)announce(tr('Reihung aktualisiert.','Ranking updated.'));
});
app.addEventListener('input',e=>{
 const el=e.target;if(!el.dataset.weight)return;
 state.weights[el.dataset.weight]=Number(el.value);save();
 const weights=normalizedWeights(state.weights);
 Object.keys(weights).forEach(k=>document.getElementById('weight-output-'+k).textContent=Math.round(weights[k])+'%');
 document.getElementById('result-content').innerHTML=resultContent();
});
app.addEventListener('click',e=>{if(e.target.tagName==='DIALOG') {const rect=e.target.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)e.target.close();}});
render();
