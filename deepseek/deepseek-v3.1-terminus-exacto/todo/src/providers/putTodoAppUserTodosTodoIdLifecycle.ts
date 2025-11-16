import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoLifecycle } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoLifecycle";
import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { ITodoAppTodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoPriority";
import { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserTodosTodoIdLifecycle(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoLifecycle.IUpdate;
}): Promise<ITodoAppTodoLifecycle> {
  // Verify the todo exists and belongs to the user
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });

  if (!todo) {
    throw new HttpException("Todo not found or access denied", 404);
  }

  // Get the current lifecycle
  const currentLifecycle =
    await MyGlobal.prisma.todo_app_todo_lifecycles.findUnique({
      where: {
        todo_app_todo_id: props.todoId,
      },
    });

  if (!currentLifecycle) {
    throw new HttpException("Todo lifecycle not found", 404);
  }

  // Get current snapshot to use as baseline
  const currentSnapshot =
    await MyGlobal.prisma.todo_app_todo_snapshots.findUnique({
      where: {
        id: currentLifecycle.todo_app_todo_snapshot_id,
      },
    });

  if (!currentSnapshot) {
    throw new HttpException("Current snapshot not found", 404);
  }

  // Validate status if provided
  let statusId = currentSnapshot.todo_app_todo_status_id;
  if (props.body.status) {
    const status = await MyGlobal.prisma.todo_app_todo_statuses.findFirst({
      where: {
        id: props.body.status.id,
        is_active: true,
      },
    });
  }

  // Validate priority if provided
  let priorityId = currentSnapshot.todo_app_todo_priority_id;
  if (props.body.priority !== undefined) {
    if (props.body.priority === null) {
      priorityId = null;
    } else if (props.body.priority) {
      const priority = await MyGlobal.prisma.todo_app_todo_priorities.findFirst(
        {
          where: {
            id: props.body.priority.id,
            is_active: true,
          },
        },
      );
    }
  }

  // Determine completed_at - if completion status is changing
  let completed_at = currentSnapshot.completed_at;
  if (props.body.current_snapshot?.completed_at !== undefined) {
    completed_at =
      props.body.current_snapshot.completed_at === null ? null : new Date();
  }

  // Create new snapshot
  const newSnapshot = await MyGlobal.prisma.todo_app_todo_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_todo_id: props.todoId,
      todo_app_todo_status_id: statusId,
      todo_app_todo_priority_id: priorityId,
      completed_at: completed_at,
      snapshot_created_at: new Date(),
    },
  });

  // Update lifecycle
  const updatedLifecycle =
    await MyGlobal.prisma.todo_app_todo_lifecycles.update({
      where: {
        id: currentLifecycle.id,
      },
      data: {
        todo_app_todo_snapshot_id: newSnapshot.id,
        updated_at: new Date(),
      },
    });

  // Fetch complete data with relationships
  const lifecycleWithRelations =
    await MyGlobal.prisma.todo_app_todo_lifecycles.findUnique({
      where: { id: updatedLifecycle.id },
      include: {
        todo: {
          include: {
            user: true,
            userSession: true,
          },
        },
        currentSnapshot: {
          include: {
            status: true,
            priority: true,
            todo: {
              include: {
                user: true,
                userSession: true,
              },
            },
          },
        },
      },
    });

  if (!lifecycleWithRelations) {
    throw new HttpException("Failed to retrieve updated lifecycle", 500);
  }

  // Transform to API response format
  return {
    id: lifecycleWithRelations.id,
    todo_app_todo_id: lifecycleWithRelations.todo_app_todo_id,
    todo_app_todo_snapshot_id: lifecycleWithRelations.todo_app_todo_snapshot_id,
    updated_at: toISOStringSafe(lifecycleWithRelations.updated_at),
    todo: lifecycleWithRelations.todo
      ? {
          id: lifecycleWithRelations.todo.id,
          user: {
            id: lifecycleWithRelations.todo.user.id,
            email: lifecycleWithRelations.todo.user.email,
            status: lifecycleWithRelations.todo.user.status,
            created_at: toISOStringSafe(
              lifecycleWithRelations.todo.user.created_at,
            ),
          },
          session: lifecycleWithRelations.todo.userSession
            ? {
                id: lifecycleWithRelations.todo.userSession.id,
                ip: lifecycleWithRelations.todo.userSession.ip,
                href: lifecycleWithRelations.todo.userSession.href,
                referrer: lifecycleWithRelations.todo.userSession.referrer,
                created_at: toISOStringSafe(
                  lifecycleWithRelations.todo.userSession.created_at,
                ),
                expired_at: toISOStringSafe(
                  lifecycleWithRelations.todo.userSession.expired_at ||
                    new Date(0),
                ),
              }
            : undefined,
          title: lifecycleWithRelations.todo.title,
          description: lifecycleWithRelations.todo.description || undefined,
          due_date: lifecycleWithRelations.todo.due_date
            ? toISOStringSafe(lifecycleWithRelations.todo.due_date)
            : undefined,
          created_at: toISOStringSafe(lifecycleWithRelations.todo.created_at),
          updated_at: toISOStringSafe(lifecycleWithRelations.todo.updated_at),
          deleted_at: lifecycleWithRelations.todo.deleted_at
            ? toISOStringSafe(lifecycleWithRelations.todo.deleted_at)
            : undefined,
        }
      : undefined,
    current_snapshot: lifecycleWithRelations.currentSnapshot
      ? {
          id: lifecycleWithRelations.currentSnapshot.id,
          todo: {
            id: lifecycleWithRelations.currentSnapshot.todo.id,
            user: {
              id: lifecycleWithRelations.currentSnapshot.todo.user.id,
              email: lifecycleWithRelations.currentSnapshot.todo.user.email,
              status: lifecycleWithRelations.currentSnapshot.todo.user.status,
              created_at: toISOStringSafe(
                lifecycleWithRelations.currentSnapshot.todo.user.created_at,
              ),
            },
            session: lifecycleWithRelations.currentSnapshot.todo.userSession
              ? {
                  id: lifecycleWithRelations.currentSnapshot.todo.userSession
                    .id,
                  ip: lifecycleWithRelations.currentSnapshot.todo.userSession
                    .ip,
                  href: lifecycleWithRelations.currentSnapshot.todo.userSession
                    .href,
                  referrer:
                    lifecycleWithRelations.currentSnapshot.todo.userSession
                      .referrer,
                  created_at: toISOStringSafe(
                    lifecycleWithRelations.currentSnapshot.todo.userSession
                      .created_at,
                  ),
                  expired_at: toISOStringSafe(
                    lifecycleWithRelations.currentSnapshot.todo.userSession
                      .expired_at || new Date(0),
                  ),
                }
              : undefined,
            title: lifecycleWithRelations.currentSnapshot.todo.title,
            description:
              lifecycleWithRelations.currentSnapshot.todo.description ||
              undefined,
            due_date: lifecycleWithRelations.currentSnapshot.todo.due_date
              ? toISOStringSafe(
                  lifecycleWithRelations.currentSnapshot.todo.due_date,
                )
              : undefined,
            created_at: toISOStringSafe(
              lifecycleWithRelations.currentSnapshot.todo.created_at,
            ),
            updated_at: toISOStringSafe(
              lifecycleWithRelations.currentSnapshot.todo.updated_at,
            ),
            deleted_at: lifecycleWithRelations.currentSnapshot.todo.deleted_at
              ? toISOStringSafe(
                  lifecycleWithRelations.currentSnapshot.todo.deleted_at,
                )
              : undefined,
          },
          status: {
            id: lifecycleWithRelations.currentSnapshot.status.id,
            code: lifecycleWithRelations.currentSnapshot.status.code,
            name: lifecycleWithRelations.currentSnapshot.status.name,
            is_active: lifecycleWithRelations.currentSnapshot.status.is_active,
          },
          priority: lifecycleWithRelations.currentSnapshot.priority
            ? {
                id: lifecycleWithRelations.currentSnapshot.priority.id,
                code: lifecycleWithRelations.currentSnapshot.priority.code,
                name: lifecycleWithRelations.currentSnapshot.priority.name,
                description:
                  lifecycleWithRelations.currentSnapshot.priority.description ||
                  undefined,
                weight: lifecycleWithRelations.currentSnapshot.priority.weight,
                is_active:
                  lifecycleWithRelations.currentSnapshot.priority.is_active,
                created_at: toISOStringSafe(
                  lifecycleWithRelations.currentSnapshot.priority.created_at,
                ),
              }
            : undefined,
          completed_at: lifecycleWithRelations.currentSnapshot.completed_at
            ? toISOStringSafe(
                lifecycleWithRelations.currentSnapshot.completed_at,
              )
            : undefined,
          snapshot_created_at: toISOStringSafe(
            lifecycleWithRelations.currentSnapshot.snapshot_created_at,
          ),
        }
      : undefined,
  };
}
