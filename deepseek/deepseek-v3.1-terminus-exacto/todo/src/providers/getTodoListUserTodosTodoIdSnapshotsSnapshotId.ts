import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoSnapshot";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserTodosTodoIdSnapshotsSnapshotId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodoSnapshot> {
  // Find the snapshot with the specified ID and verify it belongs to the user's todo
  const snapshot = await MyGlobal.prisma.todo_list_todo_snapshots.findFirst({
    where: {
      id: props.snapshotId,
      todo_list_todo_id: props.todoId,
      todo: {
        todo_list_user_id: props.user.id,
        deleted_at: null,
      },
    },
  });

  if (!snapshot) {
    throw new HttpException("Snapshot not found", 404);
  }

  // Return the snapshot data with proper type conversion
  return {
    id: snapshot.id,
    title: snapshot.title,
    description: snapshot.description ?? undefined,
    status: snapshot.status,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
