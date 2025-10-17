import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putAuthAdministratorPasswordChange(props: {
  administrator: AdministratorPayload;
  body: IEconPoliticalForumAdministrator.IChangePassword;
}): Promise<IEconPoliticalForumAdministrator.IChangePasswordResponse> {
  const { administrator, body } = props;

  // Verify administrator enrollment and linked registered user is active
  const adminRecord =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: {
        registereduser_id: administrator.id,
        deleted_at: null,
        registereduser: { deleted_at: null, is_banned: false },
      },
      include: { registereduser: true },
    });

  if (!adminRecord)
    throw new HttpException("Unauthorized: administrator not enrolled", 403);

  const user = adminRecord.registereduser;
  if (!user) throw new HttpException("User not found", 404);

  // Ensure the account has a local password to validate against
  if (!user.password_hash)
    throw new HttpException("Current password invalid", 400);

  // Verify provided current password
  const isValid = await PasswordUtil.verify(
    body.current_password,
    user.password_hash,
  );
  if (!isValid) throw new HttpException("Current password invalid", 400);

  // Hash the new password
  const newHashed = await PasswordUtil.hash(body.new_password);

  // Prepare timestamp once and reuse
  const now = toISOStringSafe(new Date());

  // Update registered user with new password and reset lockout counters
  await MyGlobal.prisma.econ_political_forum_registereduser.update({
    where: { id: user.id },
    data: {
      password_hash: newHashed,
      updated_at: now,
      failed_login_attempts: 0,
      locked_until: null,
    },
  });

  // Invalidate all active sessions for the user by marking deleted_at
  await MyGlobal.prisma.econ_political_forum_sessions.updateMany({
    where: { registereduser_id: user.id, deleted_at: null },
    data: { deleted_at: now },
  });

  // Record an audit log entry for the password change
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: user.id,
      action_type: "password_change",
      target_type: "user",
      target_identifier: user.id,
      details:
        "Administrator changed their password via authenticated endpoint",
      created_at: now,
      created_by_system: false,
    },
  });

  // Notify the user (in-app notification) about the password change
  await MyGlobal.prisma.econ_political_forum_notifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: user.id,
      type: "system",
      title: "Password changed",
      body: "Your administrator password was changed. If this was not you, contact support immediately.",
      payload: JSON.stringify({ event: "password_change" }),
      is_read: false,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    success: true,
    message: "Password changed successfully",
    timestamp: now,
  };
}
