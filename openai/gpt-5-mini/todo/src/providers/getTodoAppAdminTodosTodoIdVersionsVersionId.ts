import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminTodosTodoIdVersionsVersionId(props: {
  admin: AdminPayload;
  todoId: string & tags.Format<"uuid">;
  versionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoSnapshot> {
  const { admin, todoId, versionId } = props;

  // Authorization: ensure admin still exists
  const adminRecord = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
  });
  if (!adminRecord) throw new HttpException("Unauthorized", 403);

  // Retrieve snapshot and ensure it belongs to provided todoId
  const snapshot = await MyGlobal.prisma.todo_app_todo_snapshots.findFirst({
    where: {
      id: versionId,
      todo_app_todo_id: todoId,
    },
  });

  if (!snapshot) throw new HttpException("Not Found", 404);

  // Prepare timestamp once and reuse
  const now = toISOStringSafe(new Date());

  // Record audit event for admin view
  await MyGlobal.prisma.todo_app_audit_records.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      user_id: null,
      actor_role: "admin",
      action_type: "view_snapshot",
      target_resource: "todo_snapshot",
      target_id: versionId,
      reason: null,
      created_at: now,
    },
  });

  // Map and convert date fields to ISO strings for the API response
  return {
    id: snapshot.id,
    todo_app_todo_id: snapshot.todo_app_todo_id,
    title: snapshot.title,
    description: snapshot.description ?? null,
    is_completed: snapshot.is_completed,
    completed_at: snapshot.completed_at
      ? toISOStringSafe(snapshot.completed_at)
      : null,
    position: snapshot.position ?? null,
    created_at: toISOStringSafe(snapshot.created_at),
    updated_at: toISOStringSafe(snapshot.updated_at),
    deleted_at: snapshot.deleted_at
      ? toISOStringSafe(snapshot.deleted_at)
      : null,
    snapshot_at: toISOStringSafe(snapshot.snapshot_at),
  };
}
