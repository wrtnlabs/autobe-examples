import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskSnapshot";
import { IPageITodoAppTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTaskSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function patchTodoAppTodoUserTasksTaskIdHistory(props: {
  todoUser: TodouserPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITodoAppTaskSnapshot.IRequest;
}): Promise<IPageITodoAppTaskSnapshot.ISummary> {
  const { todoUser, taskId, body } = props;

  // Fetch task with list and owner for authorization and context
  const task = await MyGlobal.prisma.todo_app_tasks.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      list: {
        select: {
          id: true,
          title: true,
          visibility: true,
          description: true,
          todo_app_todouser_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          owner: {
            select: {
              id: true,
              display_name: true,
              is_verified: true,
              status: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
    },
  });

  // Authorization: owner or collaborator
  const isOwner = !!task.list && task.list.todo_app_todouser_id === todoUser.id;
  if (!isOwner) {
    const membership =
      await MyGlobal.prisma.todo_app_list_collaborators.findFirst({
        where: {
          todo_app_list_id: task.todo_app_list_id,
          todo_app_todouser_id: todoUser.id,
          deleted_at: null,
        },
      });

    if (!membership) {
      throw new HttpException("Not Found", 404);
    }
  }

  // Record access in user activity logs
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.todo_app_user_activity_logs.create({
    data: {
      id: v4(),
      todo_app_todouser_id: todoUser.id,
      todo_app_todouser_session_id: todoUser.session_id,
      todo_app_list_id: task.todo_app_list_id,
      todo_app_task_id: taskId,
      activity_type: "snapshot_history_view",
      details: body ? JSON.stringify(body) : null,
      created_at: now,
      updated_at: now,
    },
  });

  // Build where conditions for snapshots
  const versionCondition =
    (body.minVersion !== undefined && body.minVersion !== null) ||
    (body.maxVersion !== undefined && body.maxVersion !== null)
      ? {
          ...(body.minVersion !== undefined &&
            body.minVersion !== null && { gte: body.minVersion }),
          ...(body.maxVersion !== undefined &&
            body.maxVersion !== null && { lte: body.maxVersion }),
        }
      : undefined;

  const snapshotCreatedAtCondition =
    (body.snapshotFrom !== undefined && body.snapshotFrom !== null) ||
    (body.snapshotTo !== undefined && body.snapshotTo !== null)
      ? {
          ...(body.snapshotFrom !== undefined &&
            body.snapshotFrom !== null && { gte: body.snapshotFrom }),
          ...(body.snapshotTo !== undefined &&
            body.snapshotTo !== null && { lte: body.snapshotTo }),
        }
      : undefined;

  const whereCondition = {
    todo_app_task_id: taskId,
    ...(versionCondition && { version: versionCondition }),
    ...(body.actorId !== undefined &&
      body.actorId !== null && { todo_app_todouser_id: body.actorId }),
    ...(body.isCompleted !== undefined &&
      body.isCompleted !== null && { is_completed: body.isCompleted }),
    ...(snapshotCreatedAtCondition && {
      snapshot_created_at: snapshotCreatedAtCondition,
    }),
  } as Record<string, unknown>;

  // Pagination
  const page = Number(body.page ?? 1);
  const rawLimit = Number(body.pageSize ?? 20);
  const limit = Math.max(
    1,
    Math.min(100, Number.isNaN(rawLimit) ? 20 : rawLimit),
  );
  const offset = Number(body.pageOffset ?? (page - 1) * limit);

  // Sorting - normalize sortOrder to literal 'asc'|'desc'
  const sortOrder: "asc" | "desc" = body.sortOrder === "asc" ? "asc" : "desc";
  const orderBy =
    body.sortBy === "version"
      ? { version: sortOrder }
      : { snapshot_created_at: sortOrder };

  // Fetch snapshots and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_task_snapshots.findMany({
      where: whereCondition,
      orderBy,
      skip: offset,
      take: limit,
      select: {
        id: true,
        version: true,
        snapshot_created_at: true,
        title: true,
        description: true,
        is_completed: true,
        completed_at: true,
        due_date: true,
        original_created_at: true,
        todo_app_todouser_id: true,
        todo_app_todouser_session_id: true,
      },
    }),
    MyGlobal.prisma.todo_app_task_snapshots.count({ where: whereCondition }),
  ]);

  // Batch fetch attributed users and sessions
  const userIds = Array.from(
    new Set(
      rows
        .map((r) => r.todo_app_todouser_id)
        .filter((id): id is string => id !== null && id !== undefined),
    ),
  );
  const sessionIds = Array.from(
    new Set(
      rows
        .map((r) => r.todo_app_todouser_session_id)
        .filter((id): id is string => id !== null && id !== undefined),
    ),
  );

  const [users, sessions] = await Promise.all([
    userIds.length
      ? MyGlobal.prisma.todo_app_todouser.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            display_name: true,
            is_verified: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        })
      : [],
    sessionIds.length
      ? MyGlobal.prisma.todo_app_todouser_sessions.findMany({
          where: { id: { in: sessionIds } },
          include: {
            todouser: {
              select: {
                id: true,
                display_name: true,
                is_verified: true,
                status: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        })
      : [],
  ]);

  const userMap = new Map<string, (typeof users)[number]>();
  for (const u of users) userMap.set(u.id, u);

  const sessionMap = new Map<string, (typeof sessions)[number]>();
  for (const s of sessions) sessionMap.set(s.id, s);

  // Build todo summary from current task/list context
  const list = task.list!;
  const owner = list.owner!;

  const todoSummary = {
    id: task.id,
    title: task.title,
    isCompleted: task.is_completed,
    dueDate: list && task.due_date ? toISOStringSafe(task.due_date) : null,
    createdAt: toISOStringSafe(task.created_at),
    updatedAt: toISOStringSafe(task.updated_at),
    list: {
      id: list.id,
      title: list.title,
      visibility: list.visibility,
      owner: {
        id: owner.id,
        displayName: owner.display_name ?? null,
        isVerified: owner.is_verified,
        status: owner.status ?? undefined,
        createdAt: toISOStringSafe(owner.created_at),
        updatedAt: toISOStringSafe(owner.updated_at),
      },
      description: list.description ?? null,
      createdAt: toISOStringSafe(list.created_at),
      updatedAt: toISOStringSafe(list.updated_at),
      deletedAt: list.deleted_at ? toISOStringSafe(list.deleted_at) : null,
    },
  } satisfies ITodoAppTask.ISummary;

  // Map rows to ISummary
  const data = rows.map((row) => {
    const userRecord = row.todo_app_todouser_id
      ? (userMap.get(row.todo_app_todouser_id) ?? null)
      : null;
    const sessionRecord = row.todo_app_todouser_session_id
      ? (sessionMap.get(row.todo_app_todouser_session_id) ?? null)
      : null;

    const userSummary = userRecord
      ? {
          id: userRecord.id,
          displayName: userRecord.display_name ?? null,
          isVerified: userRecord.is_verified,
          status: userRecord.status ?? undefined,
          createdAt: toISOStringSafe(userRecord.created_at),
          updatedAt: toISOStringSafe(userRecord.updated_at),
        }
      : null;

    const sessionSummary = sessionRecord
      ? (() => {
          // Build a non-nullable user object for session.user by preferring userSummary,
          // then falling back to sessionRecord.todouser, and finally using safe defaults.
          const todouser = (sessionRecord as any).todouser ?? null;

          const sessionUser =
            (userSummary as any) ??
            (todouser
              ? {
                  id: todouser.id,
                  displayName: todouser.display_name ?? null,
                  isVerified: todouser.is_verified,
                  status: todouser.status ?? undefined,
                  createdAt: toISOStringSafe(todouser.created_at),
                  updatedAt: toISOStringSafe(todouser.updated_at),
                }
              : {
                  id: (todouser && todouser.id) || "",
                  displayName: (todouser && todouser.display_name) ?? null,
                  isVerified: (todouser && todouser.is_verified) ?? false,
                  status: (todouser && todouser.status) ?? "",
                  createdAt: toISOStringSafe(
                    (todouser && todouser.created_at) ?? new Date(),
                  ),
                  updatedAt: toISOStringSafe(
                    (todouser && todouser.updated_at) ?? new Date(),
                  ),
                });

          return {
            id: sessionRecord.id,
            user: sessionUser,
            ip: sessionRecord.ip,
            href: sessionRecord.href ?? undefined,
            referrer: sessionRecord.referrer ?? null,
            createdAt: toISOStringSafe(sessionRecord.created_at),
            expiredAt: sessionRecord.expired_at
              ? toISOStringSafe(sessionRecord.expired_at)
              : null,
          };
        })()
      : null;

    return {
      id: row.id,
      version: row.version,
      snapshotCreatedAt: toISOStringSafe(row.snapshot_created_at),
      title: row.title,
      description: row.description ?? null,
      isCompleted: row.is_completed,
      completedAt: row.completed_at ? toISOStringSafe(row.completed_at) : null,
      dueDate: row.due_date ? toISOStringSafe(row.due_date) : null,
      originalCreatedAt: row.original_created_at
        ? toISOStringSafe(row.original_created_at)
        : null,
      todo: todoSummary,
      user: userSummary,
      userSession: sessionSummary,
    } as unknown as ITodoAppTaskSnapshot.ISummary;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    data: data as unknown as ITodoAppTaskSnapshot.ISummary[],
  };
}
