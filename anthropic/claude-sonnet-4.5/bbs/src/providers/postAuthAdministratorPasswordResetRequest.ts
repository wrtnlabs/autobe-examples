import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

export async function postAuthAdministratorPasswordResetRequest(props: {
  body: IDiscussionBoardAdministrator.IResetRequest;
}): Promise<IDiscussionBoardAdministrator.IResetRequestResult> {
  const { body } = props;

  const successMessage =
    "If an account exists for that email, a password reset link has been sent";
  const now = toISOStringSafe(new Date());
  const oneHourAgo = toISOStringSafe(new Date(Date.now() - 60 * 60 * 1000));

  // Rate limiting: max 3 requests per email per hour
  const recentResetsByEmail =
    await MyGlobal.prisma.discussion_board_password_resets.count({
      where: {
        email: body.email,
        created_at: { gte: oneHourAgo },
      },
    });

  if (recentResetsByEmail >= 3) {
    await MyGlobal.prisma.discussion_board_security_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: null,
        event_type: "password_reset_abuse",
        severity: "medium",
        ip_address: "0.0.0.0",
        user_agent: null,
        description: `Excessive password reset requests for email: ${body.email}`,
        metadata: JSON.stringify({
          email: body.email,
          attempt_count: recentResetsByEmail + 1,
        }),
        created_at: now,
      },
    });

    throw new HttpException(
      "Too many password reset requests. Please try again later.",
      429,
    );
  }

  // Search for administrator
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: {
        email: body.email,
        deleted_at: null,
      },
    });

  // Generate and store reset token if administrator exists
  if (administrator) {
    const resetToken = v4() + v4();
    const resetTokenHash = await PasswordUtil.hash(resetToken);
    const expiresAt = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000));

    await MyGlobal.prisma.discussion_board_password_resets.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_administrator_id: administrator.id,
        reset_token_hash: resetTokenHash,
        email: body.email,
        is_used: false,
        expires_at: expiresAt,
        created_at: now,
        used_at: null,
      },
    });
  }

  // Log security event
  await MyGlobal.prisma.discussion_board_security_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: administrator?.id ?? null,
      event_type: "password_reset_requested",
      severity: "low",
      ip_address: "0.0.0.0",
      user_agent: null,
      description: `Password reset requested for email: ${body.email}`,
      metadata: JSON.stringify({
        email: body.email,
        administrator_found: administrator !== null,
      }),
      created_at: now,
    },
  });

  return { message: successMessage };
}
