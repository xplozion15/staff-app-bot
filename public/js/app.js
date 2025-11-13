document.addEventListener('DOMContentLoaded', () => {
  // Get Discord info from URL query parameters
  const params = new URLSearchParams(window.location.search);
  const discord_user_id = params.get('discord_user_id') || '';
  const discord_username = params.get('discord_username') || '';

  // Pre-fill hidden fields
  document.getElementById('discord_user_id').value = discord_user_id;
  document.getElementById('discord_username').value = discord_username;

  const form = document.getElementById('appForm');
  const msg = document.getElementById('msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = 'Submitting...';

    const payload = {
      discordUserId: discord_user_id,
      discordUsername: discord_username,
      motivation: document.getElementById('motivation').value.trim(),
      experience: document.getElementById('experience').value.trim(),
      roleInterest: document.getElementById('roleInterest').value.trim(),
      activity: document.getElementById('activity').value.trim(),
      notes: document.getElementById('notes').value.trim()
    };

    // Client-side validation
    if (!payload.discordUserId || !payload.discordUsername) {
      msg.textContent = "⚠️ Please open this form via the bot link so your Discord info is pre-filled.";
      return;
    }

    if (!payload.motivation || !payload.roleInterest || !payload.activity) {
      msg.textContent = "⚠️ Please fill all required fields: Motivation, Role Interest, Activity.";
      return;
    }

    try {
      const res = await fetch('/api/applications', { // fixed route
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Server error');
      }

      const data = await res.json();
      if (data.ok) {
        msg.textContent = "✅ Submitted! Application ID: " + data.id + " — We'll DM you with updates.";
        form.reset();

        // Refill Discord info after reset
        document.getElementById('discord_user_id').value = discord_user_id;
        document.getElementById('discord_username').value = discord_username;
      } else {
        msg.textContent = "⚠️ Error: " + (data.error || 'unknown');
      }
    } catch (err) {
      console.error(err);
      msg.textContent = "⚠️ Network or server error. Please try again later.";
    }
  });
});
