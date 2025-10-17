import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAdminUsersUserIdEmailVerify(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdmin.IForceVerifyNote;
}): Promise<ICommunityPlatformAdmin.IEmailVerified> {
  // Verify that the target user exists and is not deleted
  const user = await MyGlobal.prisma.community_platform_member.findFirstOrThrow(
    {
      where: {
        id: props.userId,
        deleted_at: null,
      },
    },
  );

  // If user is already verified, return success immediately
  if (user.is_verified) {
    return {
      message: "The user's email has been successfully verified.",
    };
  }

  // Update user's verification status
  await MyGlobal.prisma.community_platform_member.update({
    where: {
      id: props.userId,
    },
    data: {
      is_verified: true,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Delete any existing email verification records for this user
  await MyGlobal.prisma.community_platform_email_verifications.deleteMany({
    where: {
      member_id: props.userId,
    },
  });

  // Find the 'other' report category to use as action_type_id
  const otherCategory =
    await MyGlobal.prisma.community_platform_report_categories.findFirst({
      where: {
        name: "other",
        is_active: true,
      },
    });

  // If no 'other' category found (schema issue), throw error
  if (!otherCategory) {
    throw new HttpException(
      'System error: Report category "other" is not configured or inactive',
      500,
    );
  }

  // Log the admin action in audit logs
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_user_id: props.admin.id,
      target_user_id: props.userId,
      action_type_id: otherCategory.id,
      action_description: "Admin forced email verification for user",
      ip_address: "127.0.0.1",
      user_agent: "System Admin",
      created_at: toISOStringSafe(new Date()),
      is_system_action: false,
    },
  });

  // Return success response
  return {
    message: "The user's email has been successfully verified.",
  };
}
