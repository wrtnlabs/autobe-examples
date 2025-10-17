import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function putAuthRegisteredUserPasswordChange(props: {
  registeredUser: RegistereduserPayload;
  body: IEconPoliticalForumRegisteredUser.IChangePassword;
}): Promise<IEconPoliticalForumRegisteredUser.IGenericSuccess> {
  const { registeredUser, body } = props;

  // Fetch current user to obtain stored password_hash and status
  const user =
    await MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
      where: { id: registeredUser.id },
      select: {
        id: true,
        password_hash: true,
        deleted_at: true,
        is_banned: true,
      },
    });

  if (!user || user.deleted_at !== null || user.is_banned) {
    throw new HttpException("Unauthorized", 403);
  }

  if (!user.password_hash) {
    throw new HttpException("Current password is invalid", 400);
  }

  const isValid = await PasswordUtil.verify(
    body.currentPassword,
    user.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Current password is incorrect", 400);
  }

  const newHash = await PasswordUtil.hash(body.newPassword);

  const now = toISOStringSafe(new Date());

  // Update the user's password_hash and updated_at
  await MyGlobal.prisma.econ_political_forum_registereduser.update({
    where: { id: registeredUser.id },
    data: {
      password_hash: newHash,
      updated_at: now,
    },
  });

  // Invalidate existing sessions for this user (soft-delete + clear refresh token)
  await MyGlobal.prisma.econ_political_forum_sessions.updateMany({
    where: {
      registereduser_id: registeredUser.id,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
      refresh_token_hash: null,
      updated_at: now,
    },
  });

  // Record audit log entry
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: registeredUser.id,
      action_type: "password_change",
      target_type: "user",
      target_identifier: registeredUser.id,
      details: "Registered user changed password",
      created_at: now,
      created_by_system: false,
    },
  });

  return {
    success: true,
    message: "Password changed successfully",
    code: "PASSWORD_CHANGED",
  };
}
