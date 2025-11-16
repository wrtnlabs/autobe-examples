import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoLifecycle } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoLifecycle";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { ITodoAppTodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoPriority";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserTodosTodoIdLifecycle(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoLifecycle> {
  // First verify the todo exists and belongs to the authenticated user
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
    include: {
      user: true,
      userSession: true,
    },
  });

  if (!todo) {
    throw new HttpException("Todo not found or access denied", 404);
  }

  // Retrieve the lifecycle record with snapshot data
  const lifecycle = await MyGlobal.prisma.todo_app_todo_lifecycles.findFirst({
    where: {
      todo_app_todo_id: props.todoId,
    },
    include: {
      currentSnapshot: {
        include: {
          status: true,
          priority: true,
        },
      },
    },
  });

  if (!lifecycle) {
    throw new HttpException("Lifecycle state not found for this todo", 404);
  }

  // Transform todo to match ISummary interface
  const transformTodo = (todoRecord: typeof todo): ITodoAppTodo.ISummary => ({
    id: todoRecord.id,
    user: {
      id: todoRecord.user.id,
      email: todoRecord.user.email,
      status: todoRecord.user.status,
      created_at: toISOStringSafe(todoRecord.user.created_at),
    },
    session: todoRecord.userSession
      ? {
          id: todoRecord.userSession.id,
          ip: todoRecord.userSession.ip,
          href: todoRecord.userSession.href,
          referrer: todoRecord.userSession.referrer,
          created_at: toISOStringSafe(todoRecord.userSession.created_at),
          expired_at: todoRecord.userSession.expired_at
            ? toISOStringSafe(todoRecord.userSession.expired_at)
            : toISOStringSafe(new Date(8640000000000000)), // Max valid date
        }
      : undefined,
    title: todoRecord.title,
    description: todoRecord.description ?? undefined,
    due_date: todoRecord.due_date
      ? toISOStringSafe(todoRecord.due_date)
      : undefined,
    created_at: toISOStringSafe(todoRecord.created_at),
    updated_at: toISOStringSafe(todoRecord.updated_at),
    deleted_at: todoRecord.deleted_at
      ? toISOStringSafe(todoRecord.deleted_at)
      : undefined,
  });

  // Transform snapshot to match ITodoAppTodoSnapshot interface
  const transformSnapshot = (
    snapshot: typeof lifecycle.currentSnapshot,
  ): ITodoAppTodoSnapshot => ({
    id: snapshot.id,
    todo: transformTodo(todo),
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
  });

  return {
    id: lifecycle.id,
    todo_app_todo_id: lifecycle.todo_app_todo_id,
    todo_app_todo_snapshot_id: lifecycle.todo_app_todo_snapshot_id,
    updated_at: toISOStringSafe(lifecycle.updated_at),
    todo: transformTodo(todo),
    current_snapshot: transformSnapshot(lifecycle.currentSnapshot),
  };
}
