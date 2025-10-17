import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

export async function postAuthAdministratorPasswordResetComplete(props: {
  body: IDiscussionBoardAdministrator.IResetComplete;
}): Promise<IDiscussionBoardAdministrator.IResetCompleteResult> {
  const { body } = props;

  if (body.new_password !== body.new_password_confirm) {
    throw new HttpException("Password confirmation does not match", 400);
  }

  const passwordResets =
    await MyGlobal.prisma.discussion_board_password_resets.findMany({
      where: {
        is_used: false,
        expires_at: {
          gte: toISOStringSafe(new Date()),
        },
        discussion_board_administrator_id: {
          not: null,
        },
      },
    });

  if (passwordResets.length === 0) {
    throw new HttpException("Invalid or expired reset token", 400);
  }

  let matchedReset = null;
  for (const reset of passwordResets) {
    const isMatch = await PasswordUtil.verify(
      body.reset_token,
      reset.reset_token_hash,
    );
    if (isMatch) {
      matchedReset = reset;
      break;
    }
  }

  if (!matchedReset) {
    throw new HttpException("Invalid or expired reset token", 400);
  }

  if (!matchedReset.discussion_board_administrator_id) {
    throw new HttpException(
      "Invalid reset token - no administrator associated",
      400,
    );
  }

  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
      where: {
        id: matchedReset.discussion_board_administrator_id,
      },
    });

  const newPasswordHash = await PasswordUtil.hash(body.new_password);
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_administrators.update({
    where: {
      id: administrator.id,
    },
    data: {
      password_hash: newPasswordHash,
      updated_at: now,
    },
  });

  await MyGlobal.prisma.discussion_board_password_resets.update({
    where: {
      id: matchedReset.id,
    },
    data: {
      is_used: true,
      used_at: now,
    },
  });

  const adminSessions =
    await MyGlobal.prisma.discussion_board_sessions.findMany({
      where: {
        discussion_board_administrator_id: administrator.id,
      },
      select: {
        id: true,
      },
    });

  const sessionIds = adminSessions.map((s) => s.id);

  await MyGlobal.prisma.discussion_board_sessions.updateMany({
    where: {
      discussion_board_administrator_id: administrator.id,
      is_active: true,
    },
    data: {
      is_active: false,
      revoked_at: now,
    },
  });

  if (sessionIds.length > 0) {
    await MyGlobal.prisma.discussion_board_refresh_tokens.updateMany({
      where: {
        discussion_board_session_id: {
          in: sessionIds,
        },
        is_revoked: false,
      },
      data: {
        is_revoked: true,
        revoked_at: now,
      },
    });
  }

  await MyGlobal.prisma.discussion_board_security_logs.create({
    data: {
      id: v4(),
      user_id: null,
      event_type: "password_reset_completed",
      severity: "high",
      ip_address: "unknown",
      user_agent: null,
      description: `Administrator ${administrator.email} successfully completed password reset`,
      metadata: JSON.stringify({
        administrator_id: administrator.id,
        timestamp: now,
      }),
      created_at: now,
    },
  });

  return {
    message: "Password reset successful. Please log in with your new password.",
  };
}
