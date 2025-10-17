import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function postAuthAdministratorPasswordChange(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAdministrator.IChangePassword;
}): Promise<IDiscussionBoardAdministrator.IChangePasswordResult> {
  const { administrator, body } = props;

  const admin =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: { id: administrator.id },
    });

  if (!admin) {
    throw new HttpException("Administrator not found", 404);
  }

  if (admin.account_status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  if (!admin.email_verified) {
    throw new HttpException("Email not verified", 403);
  }

  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.current_password,
    admin.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  if (body.new_password !== body.new_password_confirm) {
    throw new HttpException("New password confirmation does not match", 400);
  }

  const isNewPasswordSameAsCurrent = await PasswordUtil.verify(
    body.new_password,
    admin.password_hash,
  );

  if (isNewPasswordSameAsCurrent) {
    throw new HttpException(
      "New password must be different from current password",
      400,
    );
  }

  const newPasswordHash = await PasswordUtil.hash(body.new_password);
  const currentTimestamp = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_administrators.update({
    where: { id: administrator.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: currentTimestamp,
    },
  });

  const allSessions = await MyGlobal.prisma.discussion_board_sessions.findMany({
    where: {
      discussion_board_administrator_id: administrator.id,
      is_active: true,
    },
  });

  for (const session of allSessions) {
    await MyGlobal.prisma.discussion_board_sessions.update({
      where: { id: session.id },
      data: {
        is_active: false,
        revoked_at: currentTimestamp,
      },
    });

    const refreshToken =
      await MyGlobal.prisma.discussion_board_refresh_tokens.findUnique({
        where: { discussion_board_session_id: session.id },
      });

    if (refreshToken) {
      await MyGlobal.prisma.discussion_board_refresh_tokens.update({
        where: { id: refreshToken.id },
        data: {
          is_revoked: true,
          revoked_at: currentTimestamp,
        },
      });
    }
  }

  await MyGlobal.prisma.discussion_board_security_logs.create({
    data: {
      id: v4(),
      user_id: administrator.id,
      event_type: "password_changed",
      severity: "high",
      ip_address: "unknown",
      user_agent: null,
      description: "Administrator password changed successfully",
      metadata: JSON.stringify({
        administrator_id: administrator.id,
        timestamp: currentTimestamp,
      }),
      created_at: currentTimestamp,
    },
  });

  return {
    message:
      "Password changed successfully. All sessions have been revoked for security. Please log in again.",
  };
}
