import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import { IPageITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTodosTodoIdVersions(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoSnapshot.IRequest;
}): Promise<IPageITodoAppTodoSnapshot> {
  const { user, todoId, body } = props;

  const page = Number(body.page ?? 1);
  const requestedLimit = Number(body.pageSize ?? 20);
  const MAX_PAGE_SIZE = 100;
  const limit = requestedLimit > MAX_PAGE_SIZE ? MAX_PAGE_SIZE : requestedLimit;

  if (page < 1) throw new HttpException("Bad Request: page must be >= 1", 400);
  if (limit < 1)
    throw new HttpException("Bad Request: pageSize must be >= 1", 400);

  const parent = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: todoId },
  });
  if (!parent) throw new HttpException("Not Found", 404);
  if (parent.user_id !== user.id)
    throw new HttpException(
      "Unauthorized: You can only view your own todo snapshots",
      403,
    );

  const sortOrder: Prisma.SortOrder = body.sortOrder === "asc" ? "asc" : "desc";
  const orderBy: Prisma.todo_app_todo_snapshotsOrderByWithRelationInput =
    body.sortBy === "created_at"
      ? { created_at: sortOrder }
      : { snapshot_at: sortOrder };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todo_snapshots.findMany({
      where: {
        todo_app_todo_id: todoId,
        ...(body.isCompleted !== undefined &&
          body.isCompleted !== null && { is_completed: body.isCompleted }),
        ...(body.includeDeleted !== true && { deleted_at: null }),
        ...((body.snapshotAtFrom !== undefined &&
          body.snapshotAtFrom !== null) ||
        (body.snapshotAtTo !== undefined && body.snapshotAtTo !== null)
          ? {
              snapshot_at: {
                ...(body.snapshotAtFrom !== undefined &&
                  body.snapshotAtFrom !== null && { gte: body.snapshotAtFrom }),
                ...(body.snapshotAtTo !== undefined &&
                  body.snapshotAtTo !== null && { lte: body.snapshotAtTo }),
              },
            }
          : {}),
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_todo_snapshots.count({
      where: {
        todo_app_todo_id: todoId,
        ...(body.isCompleted !== undefined &&
          body.isCompleted !== null && { is_completed: body.isCompleted }),
        ...(body.includeDeleted !== true && { deleted_at: null }),
        ...((body.snapshotAtFrom !== undefined &&
          body.snapshotAtFrom !== null) ||
        (body.snapshotAtTo !== undefined && body.snapshotAtTo !== null)
          ? {
              snapshot_at: {
                ...(body.snapshotAtFrom !== undefined &&
                  body.snapshotAtFrom !== null && { gte: body.snapshotAtFrom }),
                ...(body.snapshotAtTo !== undefined &&
                  body.snapshotAtTo !== null && { lte: body.snapshotAtTo }),
              },
            }
          : {}),
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    todo_app_todo_id: r.todo_app_todo_id,
    title: r.title,
    description: r.description ?? null,
    is_completed: r.is_completed,
    completed_at: r.completed_at ? toISOStringSafe(r.completed_at) : null,
    position: r.position ?? null,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
    deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    snapshot_at: toISOStringSafe(r.snapshot_at),
  }));

  const pages = limit === 0 ? 0 : Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
