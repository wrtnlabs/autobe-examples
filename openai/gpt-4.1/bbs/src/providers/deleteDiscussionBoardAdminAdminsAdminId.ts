import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, adminId } = props;

  // 1. Forbid self-delete operation
  if (admin.id === adminId) {
    throw new HttpException(
      "Administrators cannot delete their own accounts.",
      403,
    );
  }

  // 2. Check that the admin to be deleted exists, is not locked or already deleted
  const targetAdmin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: { id: adminId, deleted_at: null, is_locked: false },
  });
  if (!targetAdmin) {
    throw new HttpException(
      "The administrator account does not exist or is already deleted/locked.",
      404,
    );
  }

  // 3. Create compliance audit log before delete
  const auditLogId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: auditLogId,
      actor_admin_id: admin.id,
      target_article_id: null, // No article context, only account
      target_comment_id: null, // No comment context
      moderation_action_id: auditLogId, // Not a moderation action, using its own ID as anchor
      audit_event_type: "account_deleted",
      audit_details: `Administrator account with id \"${adminId}\" was permanently deleted by admin id \"${admin.id}\" for compliance.`,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // 4. Hard delete the admin account (cascades to sessions, moderation actions, audit logs)
  await MyGlobal.prisma.discussion_board_admins.delete({
    where: { id: adminId },
  });
}
