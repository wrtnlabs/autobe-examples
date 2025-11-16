import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { ITodoAppTodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoPriority";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserTodosTodoIdSnapshotsSnapshotId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoSnapshot> {
  // First verify the todo exists and belongs to the user
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });

  if (!todo) {
    throw new HttpException(
      "Todo not found or you don't have permission to access it",
      404,
    );
  }

  // Retrieve the specific snapshot with all related entities
  const snapshot = await MyGlobal.prisma.todo_app_todo_snapshots.findFirst({
    where: {
      id: props.snapshotId,
      todo_app_todo_id: props.todoId,
    },
    include: {
      todo: {
        include: {
          user: true,
          userSession: true,
        },
      },
      status: true,
      priority: true,
    },
  });

  if (!snapshot) {
    throw new HttpException("Snapshot not found for the specified todo", 404);
  }

  // Convert all Date objects to ISO strings and handle optional fields
  return {
    id: snapshot.id,
    todo: {
      id: snapshot.todo.id,
      user: {
        id: snapshot.todo.user.id,
        email: snapshot.todo.user.email,
        status: snapshot.todo.user.status,
        created_at: toISOStringSafe(snapshot.todo.user.created_at),
      },
      session: snapshot.todo.userSession
        ? {
            id: snapshot.todo.userSession.id,
            ip: snapshot.todo.userSession.ip,
            href: snapshot.todo.userSession.href,
            referrer: snapshot.todo.userSession.referrer,
            created_at: toISOStringSafe(snapshot.todo.userSession.created_at),
            expired_at: snapshot.todo.userSession.expired_at
              ? toISOStringSafe(snapshot.todo.userSession.expired_at)
              : toISOStringSafe(snapshot.todo.userSession.created_at),
          }
        : undefined,
      title: snapshot.todo.title,
      description: snapshot.todo.description ?? undefined,
      due_date: snapshot.todo.due_date
        ? toISOStringSafe(snapshot.todo.due_date)
        : undefined,
      created_at: toISOStringSafe(snapshot.todo.created_at),
      updated_at: toISOStringSafe(snapshot.todo.updated_at),
      deleted_at: snapshot.todo.deleted_at
        ? toISOStringSafe(snapshot.todo.deleted_at)
        : undefined,
    },
    status: {
      id: snapshot.status.id,
      code: snapshot.status.code,
      name: snapshot.status.name,
      is_active: snapshot.status.is_active,
    },
    priority: snapshot.priority
      ? {
          id: snapshot.priority.id,
          code: snapshot.priority.code,
          name: snapshot.priority.name,
          description: snapshot.priority.description ?? undefined,
          weight: snapshot.priority.weight,
          is_active: snapshot.priority.is_active ?? undefined,
          created_at: toISOStringSafe(snapshot.priority.created_at),
        }
      : undefined,
    completed_at: snapshot.completed_at
      ? toISOStringSafe(snapshot.completed_at)
      : undefined,
    snapshot_created_at: toISOStringSafe(snapshot.snapshot_created_at),
  };
}
