import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminPassword(props: {
  admin: AdminPayload;
  body: ICommunityPlatformUser.IChangePassword;
}): Promise<void> {
  // Verify current password
  const adminRecord =
    await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { password_hash: true },
    });
  // Verify current password - assuming PasswordUtil has verification capability
  const isCurrentPasswordValid = await PasswordUtil.verify(
    props.body.current_password,
    adminRecord.password_hash,
  );
  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password verification failed", 400);
  }
  // Hash new password
  const newPasswordHash = await PasswordUtil.hash(props.body.new_password);
  try {
    // Update password and invalidate sessions in transaction
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Update admin password
      await tx.community_platform_admins.update({
        where: { id: props.admin.id },
        data: {
          password_hash: newPasswordHash,
          updated_at: toISOStringSafe(new Date()),
        },
      });
      // Invalidate all active sessions
      await tx.community_platform_admin_sessions.deleteMany({
        where: { community_platform_admin_id: props.admin.id },
      });
    });
  } catch (error) {
    throw new HttpException("Password change failed. Please try again.", 500);
  }
}
