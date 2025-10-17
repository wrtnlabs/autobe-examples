import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putAuthAdminPassword(props: {
  admin: AdminPayload;
  body: ICommunityPortalAdmin.IChangePassword;
}): Promise<ICommunityPortalAdmin.IChangePasswordResponse> {
  const { admin, body } = props;

  // Ensure admin payload exists
  if (!admin || !admin.id) {
    throw new HttpException("Unauthorized", 401);
  }

  // Verify the requesting account exists and is not deleted
  const user = await MyGlobal.prisma.community_portal_users.findUnique({
    where: { id: admin.id },
  });
  if (!user) throw new HttpException("User not found", 404);
  if (user.deleted_at) throw new HttpException("User not found", 404);

  // Confirm the caller is an active admin (double-check for safety)
  const adminRecord = await MyGlobal.prisma.community_portal_admins.findFirst({
    where: { user_id: admin.id, is_active: true },
  });
  if (!adminRecord)
    throw new HttpException("Unauthorized: admin privileges required", 403);

  // Business validation: current password must match
  const isCurrentValid = await PasswordUtil.verify(
    body.currentPassword,
    user.password_hash,
  );
  if (!isCurrentValid)
    throw new HttpException("Current password is incorrect", 400);

  // Prevent password reuse (simple check)
  const isNewSameAsOld = await PasswordUtil.verify(
    body.newPassword,
    user.password_hash,
  );
  if (isNewSameAsOld)
    throw new HttpException(
      "New password must be different from the current password",
      400,
    );

  // Hash the new password and update the user record
  const newPasswordHash = await PasswordUtil.hash(body.newPassword);
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.community_portal_users.update({
    where: { id: user.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: now,
    },
  });

  // NOTE: Token revocation / audit logging not implementable without session/audit tables.
  // Signal client to reauthenticate and return audit-friendly timestamp.
  return {
    success: true,
    message: "Password changed successfully",
    updated_at: now,
    requires_reauthentication: true,
  };
}
