import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoSnapshot> {
  await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { todo_app_member_id: true },
  });
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { todo_app_member_id: true },
  });
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.todo_app_todo_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        todo_app_todo_id: props.todoId,
      },
      select: {
        id: true,
        todo_app_todo_id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        completion_status: true,
        lifecycle_deleted: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: snapshot.id,
    todoAppTodoId: snapshot.todo_app_todo_id,
    title: snapshot.title,
    description: snapshot.description ?? null,
    startDate: snapshot.start_date
      ? toISOStringSafe(snapshot.start_date)
      : null,
    dueDate: snapshot.due_date ? toISOStringSafe(snapshot.due_date) : null,
    completionStatus:
      snapshot.completion_status.trim().toLowerCase() === "true" ||
      snapshot.completion_status.trim().toLowerCase() === "1" ||
      snapshot.completion_status.trim().toLowerCase() === "yes" ||
      snapshot.completion_status.trim().toLowerCase() === "completed" ||
      Boolean(snapshot.completion_status),
    lifecycleDeleted: snapshot.lifecycle_deleted,
    createdAt: toISOStringSafe(snapshot.created_at),
    updatedAt: toISOStringSafe(snapshot.updated_at),
    deletedAt: snapshot.deleted_at
      ? toISOStringSafe(snapshot.deleted_at)
      : null,
  };
}
