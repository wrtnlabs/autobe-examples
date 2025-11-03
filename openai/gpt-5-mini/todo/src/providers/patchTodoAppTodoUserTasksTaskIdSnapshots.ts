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

export async function patchTodoAppTodoUserTasksTaskIdSnapshots(props: {
  todoUser: TodouserPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITodoAppTaskSnapshot.IRequest;
}): Promise<IPageITodoAppTaskSnapshot.ISummary> {
  const { todoUser, taskId, body } = props;

  // Fetch task with parent list and owner using select (safe shape)
  let task = null;
  try {
    task = await MyGlobal.prisma.todo_app_tasks.findUniqueOrThrow({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        is_completed: true,
        description: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        todo_app_list_id: true,
        list: {
          select: {
            id: true,
            title: true,
            visibility: true,
            description: true,
            created_at: true,
            updated_at: true,
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
  } catch {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: only owner may list snapshots
  if (!task.list || !task.list.owner || task.list.owner.id !== todoUser.id) {
    throw new HttpException("Forbidden: not owner", 403);
  }

  const page = Number(body.page ?? 1);
  const requestedPageSize = Number(body.pageSize ?? 20);

  const setting = await MyGlobal.prisma.todo_app_system_settings
    .findUnique({ where: { key: "pagination.max_page_size" } })
    .catch(() => null);
  const maxPageSize = setting ? Number(setting.value) : 100;
  if (requestedPageSize > maxPageSize) {
    throw new HttpException("Page size exceeds maximum allowed", 400);
  }
  const limit = requestedPageSize;
  const skip = (page - 1) * limit;

  const snapshotFrom = body.snapshotFrom
    ? toISOStringSafe(body.snapshotFrom)
    : undefined;
  const snapshotTo = body.snapshotTo
    ? toISOStringSafe(body.snapshotTo)
    : undefined;

  const whereClause: Record<string, unknown> = {
    todo_app_task_id: taskId,
    ...(body.actorId !== undefined &&
      body.actorId !== null && { todo_app_todouser_id: body.actorId }),
    ...(body.isCompleted !== undefined && { is_completed: body.isCompleted }),
    ...(body.q !== undefined &&
      body.q !== null && {
        OR: [
          { title: { contains: body.q } },
          { description: { contains: body.q } },
        ],
      }),
    ...(body.minVersion !== undefined &&
      body.minVersion !== null && { version: { gte: body.minVersion } }),
    ...(body.maxVersion !== undefined &&
      body.maxVersion !== null && { version: { lte: body.maxVersion } }),
  };

  if (snapshotFrom !== undefined || snapshotTo !== undefined) {
    (whereClause as any).snapshot_created_at = {
      ...(snapshotFrom !== undefined && { gte: snapshotFrom }),
      ...(snapshotTo !== undefined && { lte: snapshotTo }),
    };
  }

  const [snapshots, total] = await Promise.all([
    MyGlobal.prisma.todo_app_task_snapshots.findMany({
      where: whereClause,
      orderBy:
        body.sortBy === "version"
          ? { version: body.sortOrder === "asc" ? "asc" : "desc" }
          : { snapshot_created_at: body.sortOrder === "asc" ? "asc" : "desc" },
      skip,
      take: limit,
    }),

    MyGlobal.prisma.todo_app_task_snapshots.count({ where: whereClause }),
  ]);

  const data = snapshots.map(
    (s) =>
      ({
        id: s.id as string & tags.Format<"uuid">,
        version: s.version,
        snapshotCreatedAt: toISOStringSafe(s.snapshot_created_at),
        title: s.title,
        description: s.description ?? null,
        isCompleted: s.is_completed,
        completedAt: s.completed_at ? toISOStringSafe(s.completed_at) : null,
        dueDate: s.due_date ? toISOStringSafe(s.due_date) : null,
        originalCreatedAt: s.original_created_at
          ? toISOStringSafe(s.original_created_at)
          : null,
        todo: {
          id: task.id as string & tags.Format<"uuid">,
          title: task.title,
          isCompleted: task.is_completed,
          dueDate: task.due_date ? toISOStringSafe(task.due_date) : null,
          createdAt: toISOStringSafe(task.created_at),
          updatedAt: toISOStringSafe(task.updated_at),
          list: {
            id: task.list.id as string & tags.Format<"uuid">,
            title: task.list.title,
            visibility: task.list.visibility,
            description: task.list.description ?? null,
            createdAt: toISOStringSafe(task.list.created_at),
            updatedAt: toISOStringSafe(task.list.updated_at),
            owner: {
              id: task.list.owner.id as string & tags.Format<"uuid">,
              displayName: task.list.owner.display_name ?? null,
              isVerified: task.list.owner.is_verified,
              status: task.list.owner.status ?? undefined,
              createdAt: toISOStringSafe(task.list.owner.created_at),
              updatedAt: toISOStringSafe(task.list.owner.updated_at),
            },
          },
        },
        // Omit user and userSession summaries to avoid additional queries and
        // sensitive attribution unless explicitly required
      }) as unknown as ITodoAppTaskSnapshot.ISummary,
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
