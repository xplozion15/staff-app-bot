import dotenv from "dotenv";
dotenv.config();

import "./server.js"; // start server first so the web form is available
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import { prisma } from "./prismaClient.js";

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID; // optional for guild registration
const BOT_PUBLIC_URL = process.env.BOT_PUBLIC_URL ?? `http://localhost:${process.env.PORT || 3000}`;
const ADMIN_ROLE_NAME = process.env.ADMIN_ROLE_NAME || "Himies";

if (!TOKEN || !CLIENT_ID) {
  console.error("DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in .env");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages],
  partials: ["CHANNEL"]
});

// Register slash command /apply (registered to guild if GUILD_ID provided)
async function registerCommands() {
  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    const commands = [
      new SlashCommandBuilder().setName("apply").setDescription("Get the staff application link in DMs")
    ].map(c => c.toJSON());

    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log("Registered guild commands.");
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log("Registered global commands (may take up to 1 hour).");
    }
  } catch (err) {
    console.error("registerCommands error", err);
  }
}

client.once("ready", async () => {
  console.log(`Discord bot ready: ${client.user.tag}`);
  await registerCommands();
});

// Helper to check admin role
function isAdmin(member) {
  if (!member) return false;
  return member.roles.cache.some(role => role.name === ADMIN_ROLE_NAME);
}

// Send DM helper
async function sendDM(user, content) {
  try {
    await user.send(content);
    return true;
  } catch (err) {
    return false;
  }
}

// Interaction slash /apply
client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === "apply") {
      const url = new URL("/index.html", BOT_PUBLIC_URL);
      url.searchParams.set("discord_user_id", interaction.user.id);
      url.searchParams.set("discord_username", `${interaction.user.username}#${interaction.user.discriminator}`);

      await interaction.reply({ content: `I've sent you a DM with the application link — or click here: ${url.toString()}`, ephemeral: true });

      try {
        await interaction.user.send(`Apply here: ${url.toString()}\nThis will pre-fill your Discord username.`);
      } catch (dmErr) {
        // Do nothing; ephemeral reply already shown
        console.warn("Could not DM user (slash):", dmErr.message);
      }
    }
  } catch (err) {
    console.error("interactionCreate error", err);
  }
});

// Message prefix handler
const PREFIX = "!";

client.on("messageCreate", async (msg) => {
  try {
    if (msg.author.bot) return;

    // Public commands: !apply, !status, !help
    const content = msg.content.trim();
    if (!content.startsWith(PREFIX)) return;
    const parts = content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = parts.shift().toLowerCase();

    // PUBLIC: !help
    if (cmd === "help") {
      return msg.reply(
        `Commands:\n` +
        `• !apply — Get the application link\n` +
        `• !status — Check your application status\n` +
        `• !help — This help message\n\n` +
        `Admins (role: ${ADMIN_ROLE_NAME}) have additional commands: !applications, !viewapps, !review <discordId>, !setstatus <discordId> <accepted|rejected|pending>`
      );
    }

    // PUBLIC: !apply
    if (cmd === "apply") {
      const url = new URL("/index.html", BOT_PUBLIC_URL);
      url.searchParams.set("discord_user_id", msg.author.id);
      url.searchParams.set("discord_username", `${msg.author.username}#${msg.author.discriminator}`);
      return msg.reply(`📝 Apply here: ${url.toString()}`);
    }

    // PUBLIC: !status
    if (cmd === "status") {
      const latest = await prisma.application.findFirst({
        where: { discordUserId: msg.author.id },
        orderBy: { createdAt: "desc" }
      });
      if (!latest) return msg.reply("You have not submitted any application yet. Use `!apply` to apply.");
      return msg.reply(`Your latest application (id ${latest.id}) status: **${latest.status.toLowerCase()}**`);
    }

    // ADMIN commands below
    // check member (must be in guild)
    const member = msg.member; // undefined in DMs; we only allow admin commands from guild channels
    if (["applications", "viewapps", "review", "setstatus"].includes(cmd)) {
      // permission check
      if (!member || !isAdmin(member)) {
        return msg.reply("❌ You don't have permission to use this command.");
      }

      // Try to deliver via DM
      const dmSuccess = await sendDM(msg.author, "📬 Preparing your admin response...");

      // !applications => count
      if (cmd === "applications") {
        const count = await prisma.application.count();
        const text = `📋 There are ${count} applications received.`;
        if (dmSuccess) {
          await sendDM(msg.author, text);
          return msg.reply("✅ Sent application count to your DMs.");
        } else {
          return msg.reply(`${text}\n(Also: I couldn't DM you; please enable DMs from server members.)`);
        }
      }

      // !viewapps => list summary (limit 50)
      if (cmd === "viewapps") {
        const rows = await prisma.application.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
        if (rows.length === 0) {
          if (dmSuccess) { await sendDM(msg.author, "No applications yet."); return msg.reply("✅ Sent result to your DMs."); }
          else return msg.reply("No applications yet.");
        }
        const lines = rows.map((r, i) => `${i+1}. ${r.discordUsername} | id: ${r.discordUserId} | status: ${r.status.toLowerCase()}`);
        const text = `🧾 Latest applications:\n\n${lines.join("\n")}\n\n(Showing up to 50)`;
        if (dmSuccess) { await sendDM(msg.author, text); return msg.reply("✅ Sent application list to your DMs."); }
        else return msg.reply(text);
      }

      // !review <discordId>
      if (cmd === "review") {
        const targetId = parts[0];
        if (!targetId) return msg.reply("Usage: !review <discordId>");
        const ap = await prisma.application.findFirst({ where: { discordUserId: targetId } , orderBy: { createdAt: "desc" }});
        if (!ap) {
          if (dmSuccess) { await sendDM(msg.author, `No application found for Discord ID ${targetId}`); return msg.reply("✅ Sent result to your DMs."); }
          else return msg.reply(`No application found for Discord ID ${targetId}`);
        }
        const text =
`📄 Application by ${ap.discordUsername} (${ap.discordUserId})
— ID: ${ap.id}
— Submitted: ${ap.createdAt.toISOString()}
— Status: ${ap.status.toLowerCase()}

Motivation:
${ap.motivation}

Experience:
${ap.experience || "(none provided)"}

Role interest: ${ap.roleInterest}
Activity: ${ap.activity}

Notes:
${ap.notes || "(none)"}
`;
        if (dmSuccess) { await sendDM(msg.author, text); return msg.reply("✅ Sent full application to your DMs."); }
        else return msg.reply(text);
      }

      // !setstatus <discordId> <status>
      if (cmd === "setstatus") {
        const targetId = parts[0];
        const statusArg = (parts[1] || "").toUpperCase();
        if (!targetId || !statusArg) return msg.reply("Usage: !setstatus <discordId> <accepted|rejected|pending>");
        if (!["ACCEPTED","REJECTED","PENDING"].includes(statusArg)) return msg.reply("Status must be one of: accepted, rejected, pending");
        const ap = await prisma.application.findFirst({ where: { discordUserId: targetId } , orderBy: { createdAt: "desc" }});
        if (!ap) return msg.reply(`No application found for Discord ID ${targetId}`);
        const updated = await prisma.application.update({
          where: { id: ap.id },
          data: { status: statusArg }
        });
        // try notify applicant
        let notified = false;
        try {
          const user = await client.users.fetch(targetId);
          await user.send(`Your application (id ${ap.id}) status has been updated to: ${statusArg.toLowerCase()}`);
          notified = true;
        } catch (e) {
          notified = false;
        }

        const text = `✅ Updated ${ap.discordUsername} (${ap.discordUserId}) to ${statusArg.toLowerCase()}` + (notified ? " — applicant notified." : " — could not DM applicant.");
        if (dmSuccess) { await sendDM(msg.author, text); return msg.reply("✅ Sent confirmation to your DMs."); }
        else return msg.reply(text);
      }
    }

  } catch (err) {
    console.error("messageCreate handler error", err);
  }
});

client.login(TOKEN).catch(err => {
  console.error("Failed to login bot:", err);
  process.exit(1);
});
