import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function postAuthRegisteredUserPasswordConfirmReset(props: {
  body: IEconPoliticalForumRegisteredUser.IConfirmPasswordReset;
}): Promise<IEconPoliticalForumRegisteredUser.IGenericSuccess> {
  const { body } = props;
  const { token, new_password } = body;

  // Retrieve candidate reset records (unused and not soft-deleted)
  const candidates =
    await MyGlobal.prisma.econ_political_forum_password_resets.findMany({
      where: { used: false, deleted_at: null },
      orderBy: { created_at: "desc" },
    });

  // Locate the reset entry by verifying the provided token against stored hash
  let matched: (typeof candidates)[number] | null = null;
  for (const record of candidates) {
    if (record.expires_at && record.expires_at.getTime() < Date.now()) continue;
    const valid = await PasswordUtil.verify(token, record.reset_token_hash);
    if (valid) {
      matched = record;
      break;
    }
  }

  if (!matched) {
    throw new HttpException("Invalid or expired token", 400);
  }

  if (matched.used) {
    throw new HttpException("Invalid or expired token", 400);
  }

  // Verify user existence without leaking details
  const user =
    await MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
      where: { id: matched.registereduser_id },
    });
  if (!user) {
    throw new HttpException("Invalid or expired token", 400);
  }

  // Hash the new password
  const newHashed = await PasswordUtil.hash(new_password);

  // Single ISO timestamp reused for all updates
  const nowIso = toISOStringSafe(new Date());

  const auditId = v4() as string & tags.Format<"uuid">;

  try {
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.econ_political_forum_registereduser.update({
        where: { id: matched.registereduser_id },
        data: {
          password_hash: newHashed,
          updated_at: nowIso,
        },
      }),

      MyGlobal.prisma.econ_political_forum_password_resets.update({
        where: { id: matched.id },
        data: {
          used: true,
          used_at: nowIso,
        },
      }),

      MyGlobal.prisma.econ_political_forum_sessions.updateMany({
        where: {
          registereduser_id: matched.registereduser_id,
          deleted_at: null,
        },
        data: { deleted_at: nowIso },
      }),

      MyGlobal.prisma.econ_political_forum_audit_logs.create({
        data: {
          id: auditId,
          registereduser_id: matched.registereduser_id,
          action_type: "password_reset",
          target_type: "user",
          target_identifier: matched.registereduser_id,
          details: "Password reset confirmed via one-time token",
          created_at: nowIso,
          created_by_system: false,
        },
      }),
    ]);
  } catch (err) {
    // Unexpected error
    throw new HttpException("Internal Server Error", 500);
  }

  return {
    success: true,
    message: "Password has been reset successfully.",
    code: "PASSWORD_CHANGED",
  };
}
