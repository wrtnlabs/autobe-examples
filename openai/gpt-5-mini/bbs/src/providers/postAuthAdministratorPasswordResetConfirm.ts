import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";

export async function postAuthAdministratorPasswordResetConfirm(props: {
  body: IEconPoliticalForumAdministrator.IConfirmPasswordReset;
}): Promise<IEconPoliticalForumAdministrator.IResetConfirmResponse> {
  const { body } = props;
  const { token, new_password } = body;

  try {
    // Use single timestamp for consistency across operations
    const now = toISOStringSafe(new Date());

    // Fetch recent unused, undeleted reset attempts to verify token against stored hash
    const candidates =
      await MyGlobal.prisma.econ_political_forum_password_resets.findMany({
        where: { used: false, deleted_at: null },
        orderBy: { created_at: "desc" },
        take: 200,
      });

    let matched: (typeof candidates)[number] | null = null;

    for (const r of candidates) {
      if (!r.reset_token_hash) continue;
      if (r.expires_at && r.expires_at.getTime() < new Date().getTime())
        continue;
      const ok = await PasswordUtil.verify(token, r.reset_token_hash);
      if (ok) {
        matched = r;
        break;
      }
    }

    if (!matched) {
      // Record a non-identifying audit entry for failed attempts
      await MyGlobal.prisma.econ_political_forum_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          action_type: "password_reset_confirm_failed",
          target_type: "password_reset",
          details: "Invalid or expired password reset token attempt",
          created_at: now,
          created_by_system: true,
        },
      });

      return { success: false, message: "Invalid or expired token" };
    }

    if (!matched.registereduser_id) {
      // Defensive: should not happen, but handle gracefully
      await MyGlobal.prisma.econ_political_forum_password_resets.update({
        where: { id: matched.id },
        data: { used: true, used_at: now },
      });

      return { success: false, message: "Invalid or expired token" };
    }

    const user =
      await MyGlobal.prisma.econ_political_forum_registereduser.findUniqueOrThrow(
        {
          where: { id: matched.registereduser_id },
        },
      );

    // Hash new password and update user
    const hashed = await PasswordUtil.hash(new_password);

    await MyGlobal.prisma.econ_political_forum_registereduser.update({
      where: { id: user.id },
      data: {
        password_hash: hashed,
        updated_at: now,
      },
    });

    // Mark reset record as used
    await MyGlobal.prisma.econ_political_forum_password_resets.update({
      where: { id: matched.id },
      data: { used: true, used_at: now },
    });

    // Invalidate existing sessions for the user
    await MyGlobal.prisma.econ_political_forum_sessions.updateMany({
      where: { registereduser_id: user.id, deleted_at: null },
      data: { deleted_at: now, updated_at: now },
    });

    // Audit successful password reset
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: user.id,
        action_type: "password_reset_confirm",
        target_type: "user",
        target_identifier: user.id,
        details: "Password reset confirmed via token",
        created_at: now,
        created_by_system: false,
      },
    });

    return {
      success: true,
      message: "Password reset successful",
      user_id: user.id,
      next_step: "login_required",
    };
  } catch (err) {
    // Unexpected errors should surface as 500
    throw new HttpException("Internal Server Error", 500);
  }
}
