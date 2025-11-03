import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoAppAdminTodoUsersTodoUserId(props: {
  admin: AdminPayload;
  todoUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, todoUserId } = props;

  // Validate UUID format (business-level validation)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(todoUserId)) {
    throw new HttpException("Invalid todoUserId format", 400);
  }

  // Check existence and soft-delete state
  const user = await MyGlobal.prisma.todo_app_todouser.findUnique({
    where: { id: todoUserId },
    select: { id: true, email: true, deleted_at: true, status: true },
  });

  if (user === null) {
    throw new HttpException("Not Found", 404);
  }

  // Idempotent: if already soft-deleted, return successfully
  if (user.deleted_at !== null) return;

  // Single timestamp for all operations
  const now = toISOStringSafe(new Date());

  try {
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.todo_app_todouser.update({
        where: { id: todoUserId },
        data: {
          deleted_at: now,
          status: "pending_deletion",
          refresh_tokens_revoked_at: now,
          updated_at: now,
        },
      }),

      MyGlobal.prisma.todo_app_todouser_sessions.updateMany({
        where: {
          todo_app_todouser_id: todoUserId,
          expired_at: null,
        },
        data: { expired_at: now },
      }),

      MyGlobal.prisma.todo_app_admin_actions.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_admin_id: admin.id,
          todo_app_admin_session_id: admin.session_id,
          todo_app_todouser_id: todoUserId,
          action: "soft_delete",
          reason: "Admin initiated soft-delete via admin API",
          target_type: "todo_user",
          target_id: todoUserId,
          created_at: now,
          updated_at: now,
        },
      }),

      MyGlobal.prisma.todo_app_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_admin_id: admin.id,
          todo_app_admin_session_id: admin.session_id,
          todo_app_todouser_id: todoUserId,
          event_type: "delete",
          target_type: "todo_user",
          target_id: todoUserId,
          details: `Admin ${admin.id} performed soft-delete on todo user ${todoUserId} (${user.email})`,
          created_at: now,
          updated_at: now,
        },
      }),
    ]);

    return;
  } catch (error) {
    // Unexpected error
    throw new HttpException("Internal Server Error", 500);
  }
}
