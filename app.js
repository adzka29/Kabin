// Tabungan Pribadi PWA - all data stored in localStorage
const $ = (q) => document.querySelector(q);
const txKey = 'tabungan_tx_v1';
const targetKey = 'tabungan_target_v1';
let deferredPrompt = null;

function rp(num){
  if (typeof num !== 'number') num = Number(num||0);
  return 'Rp ' + num.toLocaleString('id-ID');
}

function readData(){
  try{ return JSON.parse(localStorage.getItem(txKey)) || []; }
  catch(e){ return []; }
}
function writeData(arr){
  localStorage.setItem(txKey, JSON.stringify(arr));
}

function loadTarget(){
  const v = Number(localStorage.getItem(targetKey)||0);
  if (v>0){ $('#targetInput').value = v; }
  render();
}
function saveTarget(){
  const v = Number($('#targetInput').value || 0);
  localStorage.setItem(targetKey, String(v>0? v : 0));
  render();
}

function addTx(e){
  e.preventDefault();
  const type = $('#type').value;
  const date = $('#date').value || new Date().toISOString().slice(0,10);
  const amount = Math.max(0, Number($('#amount').value||0));
  const category = ($('#category').value||'').trim();
  const note = ($('#note').value||'').trim();

  if(!amount){ alert('Jumlah harus diisi.'); return; }

  const tx = { id: crypto.randomUUID(), type, date, amount, category, note, ts: Date.now() };
  const data = readData();
  data.push(tx);
  writeData(data);
  $('#txForm').reset();
  render();
}

function removeTx(id){
  const data = readData().filter(x=>x.id!==id);
  writeData(data);
  render();
}

function exportCsv(){
  const rows = [['tanggal','jenis','kategori','catatan','jumlah']];
  readData().forEach(t=>rows.push([t.date, t.type, t.category, t.note, t.amount]));
  const csv = rows.map(r=>r.map(v => '"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'tabungan.csv';
  document.body.appendChild(a); a.click();
  URL.revokeObjectURL(url); a.remove();
}

function clearAll(){
  if(confirm('Hapus semua transaksi?')){
    localStorage.removeItem(txKey);
    render();
  }
}

function render(){
  // filters
  const month = $('#monthFilter').value; // yyyy-mm
  const q = ($('#search').value||'').toLowerCase();

  const list = $('#txList'); list.innerHTML='';
  const data = readData().sort((a,b)=>b.ts-a.ts);
  const target = Number(localStorage.getItem(targetKey)||0);

  let income=0, expense=0;

  data.forEach(t=>{
    const ym = t.date?.slice(0,7);
    if(month && ym !== month) return;
    const text = (t.category+' '+t.note).toLowerCase();
    if(q && !text.includes(q)) return;

    if(t.type==='income') income+=t.amount; else expense+=t.amount;

    const li = document.createElement('li');
    li.className = `tx ${t.type}`;
    li.innerHTML = `
      <div>
        <div><strong>${t.category||'(Tanpa kategori)'}</strong></div>
        <div class="meta">${t.date} • ${t.note||'—'}</div>
      </div>
      <div class="right">
        <div class="amount">${rp(t.amount)}</div>
        <button class="del" title="Hapus">🗑</button>
      </div>`;
    li.querySelector('.del').addEventListener('click', ()=>removeTx(t.id));
    list.appendChild(li);
  });

  const saldo = income - expense;
  $('#income').textContent = rp(income);
  $('#expense').textContent = rp(expense);
  $('#saldo').textContent = rp(saldo);

  if(target>0){
    const sisa = Math.max(0, target - saldo);
    const progress = Math.min(100, Math.round((saldo/target)*100));
    $('#targetInfo').textContent = saldo>=target
      ? `🎉 Target tercapai! (${progress}%)`
      : `Progres: ${progress}% • Sisa ${rp(sisa)}`;
  } else {
    $('#targetInfo').textContent = 'Belum ada target.';
  }
}

// PWA install handling
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  btn.style.display='inline-flex';
});

document.getElementById('installBtn').addEventListener('click', async ()=>{
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById('installBtn').style.display='none';
});

// events
document.getElementById('txForm').addEventListener('submit', addTx);
document.getElementById('exportCsv').addEventListener('click', exportCsv);
document.getElementById('clearAll').addEventListener('click', clearAll);
document.getElementById('saveTarget').addEventListener('click', saveTarget);
document.getElementById('monthFilter').addEventListener('change', render);
document.getElementById('search').addEventListener('input', render);

// init date default
document.getElementById('date').value = new Date().toISOString().slice(0,10);

// service worker
if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js');
  });
}

loadTarget();
render();
