document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const discord_user_id = params.get('discord_user_id') || '';
  const discord_username = params.get('discord_username') || '';

  document.getElementById('discord_user_id').value = discord_user_id;
  document.getElementById('discord_username').value = discord_username;

  const form = document.getElementById('appForm');
  const msg = document.getElementById('msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = 'Submitting...';

    const payload = {
      discordUserId: document.getElementById('discord_user_id').value,
      discordUsername: document.getElementById('discord_username').value || '',
      motivation: document.getElementById('motivation').value.trim(),
      experience: document.getElementById('experience').value.trim(),
      roleInterest: document.getElementById('roleInterest').value.trim(),
      activity: document.getElementById('activity').value.trim(),
      notes: document.getElementById('notes').value.trim()
    };

    // simple client-side validation
    if (!payload.discordUserId || !payload.discordUsername) {
      msg.textContent = "Please open this form from the bot link so your Discord info is pre-filled.";
      return;
    }
    if (!payload.motivation || !payload.roleInterest || !payload.activity) {
      msg.textContent = "Please fill required fields (motivation, role interest, activity).";
      return;
    }

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      if (j.ok) {
        msg.textContent = "✅ Submitted! Application ID: " + j.id + " — We'll DM you with updates.";
        form.reset();
        // re-fill discord username hidden fields
        document.getElementById('discord_user_id').value = discord_user_id;
        document.getElementById('discord_username').value = discord_username;
      } else {
        msg.textContent = "Error: " + (j.error || 'unknown');
      }
    } catch (err) {
      console.error(err);
      msg.textContent = "Network error";
    }
  });
});
