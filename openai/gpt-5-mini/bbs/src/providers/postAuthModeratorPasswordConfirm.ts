import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

export async function postAuthModeratorPasswordConfirm(props: {
  body: IEconPoliticalForumModerator.IPasswordResetConfirm;
}): Promise<IEconPoliticalForumModerator.IPasswordResetConfirmAck> {
  const { body } = props;
  const { token, new_password } = body;

  // Current timestamp as ISO string
  const now = toISOStringSafe(new Date());

  // Find recent candidate reset records that are not used
  const candidates =
    await MyGlobal.prisma.econ_political_forum_password_resets.findMany({
      where: { used: false },
      orderBy: { created_at: "desc" },
      take: 50,
    });

  // Locate matching reset by verifying the token against stored hash and checking expiry
  let matched: (typeof candidates)[number] | null = null;
  for (const cand of candidates) {
    if (!cand.reset_token_hash) continue;
    if (cand.expires_at) {
      const expires = toISOStringSafe(cand.expires_at);
      if (expires < now) continue; // expired
    } else {
      continue; // no expiry information; skip
    }

    // Verify token against stored hash
    const ok = await PasswordUtil.verify(token, cand.reset_token_hash);
    if (ok) {
      matched = cand;
      break;
    }
  }

  if (!matched) {
    throw new HttpException("Invalid or expired token", 400);
  }

  // Fetch the user
  const user =
    await MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
      where: { id: matched.registereduser_id },
    });
  if (!user) throw new HttpException("User not found", 404);

  // Hash the new password
  const newHash = await PasswordUtil.hash(new_password);

  // Prepare audit id and timestamp
  const auditId = v4() as string & tags.Format<"uuid">;
  const timestamp = toISOStringSafe(new Date());

  // Execute transactional updates: update user password, mark reset used, invalidate sessions, create audit log
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.econ_political_forum_registereduser.update({
      where: { id: user.id },
      data: {
        password_hash: newHash,
        updated_at: timestamp,
      },
    }),

    MyGlobal.prisma.econ_political_forum_password_resets.update({
      where: { id: matched.id },
      data: {
        used: true,
        used_at: timestamp,
      },
    }),

    MyGlobal.prisma.econ_political_forum_sessions.updateMany({
      where: { registereduser_id: user.id, deleted_at: null },
      data: { deleted_at: timestamp },
    }),

    MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: auditId,
        registereduser_id: user.id,
        action_type: "password_reset_confirm",
        target_type: "user",
        target_identifier: user.id,
        details: "Password reset confirmed via token",
        created_at: timestamp,
        created_by_system: false,
      },
    }),
  ]);

  return {
    success: true,
    message: "Password updated; please sign in with your new password",
  };
}
