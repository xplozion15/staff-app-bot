document.getElementById('loadBtn').addEventListener('click', loadSubmissions);
document.getElementById('refreshBtn').addEventListener('click', loadSubmissions);

async function loadSubmissions() {
  const key = document.getElementById('apiKey').value.trim();
  if (!key) return alert('Enter API key');
  const res = await fetch(`/api/submissions?limit=200`, { headers: { 'x-staff-key': key } });
  const j = await res.json();
  if (!j.ok) return alert('Error: ' + (j.error || 'unknown'));
  renderList(j.submissions);
}

function renderList(items) {
  const root = document.getElementById('list');
  if (!items || items.length === 0) { root.innerHTML = '<p>No submissions found.</p>'; return; }
  const rows = items.map(it => {
    const created = new Date(it.createdAt).toLocaleString();
    return `
      <div class="listItem">
        <div><strong>${escapeHtml(it.discordUsername)}</strong> — <em>${escapeHtml(it.discordUserId)}</em> — <small>${created}</small></div>
        <div style="margin-top:8px;"><strong>Motivation:</strong><pre>${escapeHtml(it.motivation)}</pre></div>
        <div style="margin-top:8px;"><strong>Experience:</strong><pre>${escapeHtml(it.experience || '(none)')}</pre></div>
        <div style="margin-top:8px;"><strong>Role interest:</strong> ${escapeHtml(it.roleInterest)}</div>
        <div style="margin-top:8px;"><strong>Activity:</strong> ${escapeHtml(it.activity)}</div>
        <div style="margin-top:8px;"><strong>Notes:</strong><pre>${escapeHtml(it.notes || '(none)')}</pre></div>
        <div style="margin-top:8px;"><em>ID: ${it.id} • Status: ${it.status.toLowerCase()}</em></div>
      </div>
    `;
  }).join('');
  root.innerHTML = rows;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}
