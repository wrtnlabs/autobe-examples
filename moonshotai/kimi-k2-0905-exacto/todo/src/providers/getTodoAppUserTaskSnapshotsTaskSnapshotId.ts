import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskSnapshot";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserTaskSnapshotsTaskSnapshotId(props: {
  user: UserPayload;
  taskSnapshotId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTaskSnapshot> {
  const snapshot = await MyGlobal.prisma.todo_app_task_snapshots.findUnique({
    where: { id: props.taskSnapshotId },
  });

  if (!snapshot) {
    throw new HttpException("Task snapshot not found", 404);
  }

  // Verify the snapshot belongs to the authenticated user
  if (snapshot.todo_app_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: snapshot.id,
    todo_app_task_id: snapshot.todo_app_task_id,
    title: snapshot.title,
    description: snapshot.description,
    status: typia.assert<"pending" | "complete">(snapshot.status),
    completed_at: snapshot.completed_at
      ? toISOStringSafe(snapshot.completed_at)
      : null,
    created_at: toISOStringSafe(snapshot.created_at),
    todo_app_user_id: snapshot.todo_app_user_id,
  };
}
