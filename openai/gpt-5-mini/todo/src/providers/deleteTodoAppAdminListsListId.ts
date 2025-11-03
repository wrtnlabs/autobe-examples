import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoAppAdminListsListId(props: {
  admin: AdminPayload;
  listId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, listId } = props;

  // Fetch the list and ensure it's active (not already soft-deleted)
  const list = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
    select: { id: true, deleted_at: true },
  });

  if (!list || list.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Current timestamp as ISO string
  const now = toISOStringSafe(new Date());

  // Perform soft-delete
  await MyGlobal.prisma.todo_app_lists.update({
    where: { id: listId },
    data: {
      deleted_at: now,
    },
  });

  // Create audit log for this administrative action
  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_admin_id: admin.id,
      todo_app_admin_session_id: admin.session_id,
      todo_app_list_id: listId,
      event_type: "delete",
      details: `Admin ${admin.id} soft-deleted list ${listId}`,
      created_at: now,
      updated_at: now,
    },
  });

  return;
}
