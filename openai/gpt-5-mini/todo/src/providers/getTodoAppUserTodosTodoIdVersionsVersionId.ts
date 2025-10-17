import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserTodosTodoIdVersionsVersionId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  versionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoSnapshot> {
  const { user, todoId, versionId } = props;

  const snapshot = await MyGlobal.prisma.todo_app_todo_snapshots.findUnique({
    where: { id: versionId },
  });

  if (!snapshot) throw new HttpException("Not Found", 404);
  if (snapshot.todo_app_todo_id !== todoId)
    throw new HttpException("Not Found", 404);

  const parent = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: todoId },
    select: { user_id: true },
  });

  if (!parent) throw new HttpException("Not Found", 404);
  if (parent.user_id !== user.id)
    throw new HttpException(
      "Unauthorized: You can only access your own snapshots",
      403,
    );

  return {
    id: snapshot.id as string & tags.Format<"uuid">,
    todo_app_todo_id: snapshot.todo_app_todo_id as string & tags.Format<"uuid">,
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
