import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdminUserPasswordChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserPasswordChange";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function putAuthAdminUserPassword(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformAdminUserPasswordChange.IUpdate;
}): Promise<ICommunityPlatformAdminUserPasswordChange.ISummary> {
  const { adminUser, body } = props;

  // Authorization: ensure admin assignment is active and user is not soft-deleted
  const adminAssignment =
    await MyGlobal.prisma.community_platform_admin_users.findFirst({
      where: {
        community_platform_user_id: adminUser.id,
        revoked_at: null,
        deleted_at: null,
        user: { is: { deleted_at: null } },
      },
    });
  if (adminAssignment === null) {
    throw new HttpException("Forbidden: Not an active administrator", 403);
  }

  // Load user for password verification
  const user = await MyGlobal.prisma.community_platform_users.findUniqueOrThrow(
    {
      where: { id: adminUser.id },
    },
  );
  if (user.deleted_at !== null) {
    throw new HttpException("Forbidden: Account is deactivated", 403);
  }

  // Verify current password
  const isValid = await PasswordUtil.verify(
    body.current_password,
    user.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Bad Request: Current password is incorrect", 400);
  }

  // Hash new password
  const newHash = await PasswordUtil.hash(body.new_password);
  const now = toISOStringSafe(new Date());

  // Update password and audit timestamp
  await MyGlobal.prisma.community_platform_users.update({
    where: { id: adminUser.id },
    data: {
      password_hash: newHash,
      updated_at: now,
    },
  });

  return { status: "updated" };
}
