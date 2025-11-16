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
  // Step 1: Find target admin (ensure not already deleted)
  const targetAdmin = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!targetAdmin || targetAdmin.deleted_at !== null) {
    throw new HttpException("Administrator not found or already deleted", 404);
  }
  // Step 2: Remove the admin record permanently
  await MyGlobal.prisma.discussion_board_admins.delete({
    where: { id: props.adminId },
  });
  // Step 3: Audit log the action
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_moderation_logs.create({
    data: {
      id: v4(),
      admin_id: props.admin.id,
      target_type: "admin",
      target_id: props.adminId,
      action_code: "delete",
      note: "Permanent administrator deletion via erase endpoint.",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
