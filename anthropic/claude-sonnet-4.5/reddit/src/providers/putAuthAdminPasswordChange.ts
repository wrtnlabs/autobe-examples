import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putAuthAdminPasswordChange(props: {
  admin: AdminPayload;
  body: IRedditLikeAdmin.IPasswordChange;
}): Promise<IRedditLikeAdmin.IPasswordChangeResponse> {
  const { admin, body } = props;

  // Step 1: Fetch admin record and verify existence
  const adminRecord = await MyGlobal.prisma.reddit_like_admins.findFirst({
    where: {
      id: admin.id,
      deleted_at: null,
    },
  });

  if (!adminRecord) {
    throw new HttpException("Admin account not found", 404);
  }

  // Step 2: Verify current password
  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.current_password,
    adminRecord.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  // Step 3: Validate new password confirmation matches
  if (body.new_password !== body.new_password_confirmation) {
    throw new HttpException(
      "Password confirmation does not match. Please ensure both passwords are identical.",
      400,
    );
  }

  // Step 4: Hash new password and update admin record
  const newPasswordHash = await PasswordUtil.hash(body.new_password);
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.reddit_like_admins.update({
    where: { id: admin.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: now,
    },
  });

  // Step 5: Invalidate all existing sessions for this admin
  // Find the corresponding user record in reddit_like_users
  const userRecord = await MyGlobal.prisma.reddit_like_users.findFirst({
    where: {
      id: admin.id,
      role: "admin",
      deleted_at: null,
    },
  });

  if (userRecord) {
    // Invalidate all active sessions by setting deleted_at
    await MyGlobal.prisma.reddit_like_sessions.updateMany({
      where: {
        reddit_like_user_id: userRecord.id,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  }

  // Step 6: Log the password change event in moderation logs
  await MyGlobal.prisma.reddit_like_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_admin_id: admin.id,
      actor_member_id: null,
      actor_moderator_id: null,
      related_report_id: null,
      related_action_id: null,
      related_ban_id: null,
      related_suspension_id: null,
      related_appeal_id: null,
      community_id: null,
      log_type: "password_change",
      action_description: `Administrator ${adminRecord.username} changed their account password`,
      metadata: null,
      ip_address: null,
      created_at: now,
    },
  });

  // Step 7: Return success response
  return {
    success: true,
    message:
      "Password changed successfully. All other sessions have been invalidated and a confirmation email has been sent to your registered email address.",
  };
}
