import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoAppAdminListsListIdSharesShareId(props: {
  admin: AdminPayload;
  listId: string & tags.Format<"uuid">;
  shareId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, listId, shareId } = props;

  // Ensure admin payload exists
  if (!admin || !admin.id) {
    throw new HttpException("Unauthorized", 401);
  }

  // Verify parent list exists and is active (not soft-deleted)
  const list = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
  });
  if (!list || list.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Verify share exists, belongs to the list, and is not already deleted
  const share = await MyGlobal.prisma.todo_app_list_shares.findUnique({
    where: { id: shareId },
  });
  if (
    !share ||
    share.todo_app_list_id !== listId ||
    share.deleted_at !== null
  ) {
    throw new HttpException("Not Found", 404);
  }

  // Perform soft-delete and record audit/admin action within a transaction
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_app_list_shares.update({
      where: { id: shareId },
      data: { deleted_at: now },
    }),

    MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4(),
        todo_app_admin_id: admin.id,
        todo_app_list_id: listId,
        event_type: "share_revoked",
        target_type: "list_share",
        target_id: shareId,
        details: `Admin ${admin.id} revoked list share ${shareId} for list ${listId}`,
        created_at: now,
        updated_at: now,
      },
    }),

    MyGlobal.prisma.todo_app_admin_actions.create({
      data: {
        id: v4(),
        todo_app_admin_id: admin.id,
        action: "revoke_share",
        reason: `Revoked share ${shareId} for list ${listId}`,
        target_type: "list_share",
        target_id: shareId,
        created_at: now,
        updated_at: now,
      },
    }),
  ]);

  return;
}
