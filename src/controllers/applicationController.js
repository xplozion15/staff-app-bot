import { prisma } from "../prismaClient.js";
import { nanoid } from "nanoid";

function trimTo(s, max = 1000) {
  if (!s) return null;
  const t = String(s).trim();
  return t.length > max ? t.slice(0, max) : t;
}

export async function createApplication(req, res) {
  try {
    const body = req.body || {};
    const discordUserId = trimTo(body.discordUserId || body.discord_user_id, 64);
    const discordUsername = trimTo(body.discordUsername || body.discord_username || '', 100);
    const motivation = trimTo(body.motivation || (body.answers && body.answers.motivation) || '', 500);
    const experience = trimTo(body.experience || (body.answers && body.answers.experience) || '', 400);
    const roleInterest = trimTo(body.roleInterest || (body.answers && body.answers.roleInterest) || '', 200);
    const activity = trimTo(body.activity || (body.answers && body.answers.activity) || '', 200);
    const notes = trimTo(body.notes || (body.answers && body.answers.notes) || '', 300);

    if (!discordUserId || !discordUsername || !motivation || !roleInterest || !activity) {
      return res.status(400).json({ error: 'missing required fields' });
    }

    const created = await prisma.application.create({
      data: {
        id: nanoid(12),
        discordUserId,
        discordUsername,
        motivation,
        experience,
        roleInterest,
        activity,
        notes
      }
    });

    return res.json({ ok: true, id: created.id });
  } catch (err) {
    console.error("createApplication error", err);
    return res.status(500).json({ error: 'server error' });
  }
}

export async function listApplications(req, res) {
  try {
    const limit = Math.min(500, parseInt(req.query.limit || "100", 10));
    const page = Math.max(0, parseInt(req.query.page || "0", 10));
    const skip = page * limit;

    const rows = await prisma.application.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip
    });
    return res.json({ ok: true, submissions: rows });
  } catch (err) {
    console.error("listApplications error", err);
    return res.status(500).json({ error: 'server error' });
  }
}
