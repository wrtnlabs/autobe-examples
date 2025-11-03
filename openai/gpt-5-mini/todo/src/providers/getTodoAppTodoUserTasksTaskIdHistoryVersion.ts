import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskSnapshot";
import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function getTodoAppTodoUserTasksTaskIdHistoryVersion(props: {
  todoUser: TodouserPayload;
  taskId: string & tags.Format<"uuid">;
  version: number & tags.Type<"int32">;
}): Promise<ITodoAppTaskSnapshot> {
  const { todoUser, taskId, version } = props;

  // Fetch the snapshot by composite key (todo_app_task_id + version)
  const snapshot = await MyGlobal.prisma.todo_app_task_snapshots.findFirst({
    where: {
      todo_app_task_id: taskId,
      version: version,
    },
  });

  if (!snapshot) {
    throw new HttpException("Not Found", 404);
  }

  // Fetch the current task to build the todo summary (and obtain list id)
  const task = await MyGlobal.prisma.todo_app_tasks.findUniqueOrThrow({
    where: { id: taskId },
  });

  // Fetch the list and include owner and membership for authorization
  const list = await MyGlobal.prisma.todo_app_lists.findUniqueOrThrow({
    where: { id: task.todo_app_list_id },
    include: {
      owner: true,
      todo_app_list_collaborators: {
        where: {
          todo_app_todouser_id: todoUser.id,
          deleted_at: null,
        },
      },
    },
  });

  // Authorization: owner OR collaborator (non-deleted)
  const isOwner = list.owner && list.owner.id === todoUser.id;
  const isCollaborator =
    Array.isArray(list.todo_app_list_collaborators) &&
    list.todo_app_list_collaborators.length > 0;

  if (!isOwner && !isCollaborator) {
    // Return 404 for unauthorized as per spec
    throw new HttpException("Not Found", 404);
  }

  // Conditionally fetch attributed user summary
  let attributedUser: ITodoAppTodoUser.ISummary | undefined = undefined;
  if (
    snapshot.todo_app_todouser_id !== null &&
    snapshot.todo_app_todouser_id !== undefined
  ) {
    const u = await MyGlobal.prisma.todo_app_todouser.findUnique({
      where: { id: snapshot.todo_app_todouser_id },
    });
    if (u) {
      attributedUser = {
        id: u.id,
        displayName: u.display_name ?? null,
        isVerified: u.is_verified,
        status: u.status ?? undefined,
        createdAt: toISOStringSafe(u.created_at),
        updatedAt: toISOStringSafe(u.updated_at),
      };
    }
  }

  // Conditionally fetch attributed session summary
  let attributedSession: ITodoAppTodouserSession.ISummary | undefined =
    undefined;
  if (
    snapshot.todo_app_todouser_session_id !== null &&
    snapshot.todo_app_todouser_session_id !== undefined
  ) {
    const s = await MyGlobal.prisma.todo_app_todouser_sessions.findUnique({
      where: { id: snapshot.todo_app_todouser_session_id },
      include: { todouser: true },
    });
    if (s) {
      const sessionUser = s.todouser
        ? {
            id: s.todouser.id,
            displayName: s.todouser.display_name ?? null,
            isVerified: s.todouser.is_verified,
            status: s.todouser.status ?? undefined,
            createdAt: toISOStringSafe(s.todouser.created_at),
            updatedAt: toISOStringSafe(s.todouser.updated_at),
          }
        : undefined;

      attributedSession = {
        id: s.id,
        user: sessionUser!,
        ip: s.ip,
        href: s.href ?? undefined,
        referrer: s.referrer ?? null,
        createdAt: toISOStringSafe(s.created_at),
        expiredAt: s.expired_at ? toISOStringSafe(s.expired_at) : null,
      };
    }
  }

  // Build the todo summary (current task state)
  const todoSummary: ITodoAppTask.ISummary = {
    id: task.id,
    title: task.title,
    isCompleted: task.is_completed,
    dueDate: task.due_date ? toISOStringSafe(task.due_date) : null,
    createdAt: toISOStringSafe(task.created_at),
    updatedAt: toISOStringSafe(task.updated_at),
    list: {
      id: list.id,
      title: list.title,
      visibility: list.visibility,
      owner: {
        id: list.owner.id,
        displayName: list.owner.display_name ?? null,
        isVerified: list.owner.is_verified,
        status: list.owner.status ?? undefined,
        createdAt: toISOStringSafe(list.owner.created_at),
        updatedAt: toISOStringSafe(list.owner.updated_at),
      },
      description: list.description ?? null,
      createdAt: toISOStringSafe(list.created_at),
      updatedAt: toISOStringSafe(list.updated_at),
      deletedAt: list.deleted_at ? toISOStringSafe(list.deleted_at) : undefined,
    },
  };

  // Construct the final snapshot DTO
  const result: ITodoAppTaskSnapshot = {
    id: snapshot.id,
    todo: todoSummary,
    user: attributedUser ?? undefined,
    userSession: attributedSession ?? undefined,
    title: snapshot.title,
    description: snapshot.description ?? null,
    isCompleted: snapshot.is_completed,
    completedAt: snapshot.completed_at
      ? toISOStringSafe(snapshot.completed_at)
      : null,
    dueDate: snapshot.due_date ? toISOStringSafe(snapshot.due_date) : null,
    originalCreatedAt: snapshot.original_created_at
      ? toISOStringSafe(snapshot.original_created_at)
      : null,
    snapshotCreatedAt: toISOStringSafe(snapshot.snapshot_created_at),
    version: snapshot.version,
  };

  return result;
}
