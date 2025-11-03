import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import { IPageITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTaskTag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function patchTodoAppTodoUserTaskTags(props: {
  todoUser: TodouserPayload;
  body: ITodoAppTaskTag.IRequest;
}): Promise<IPageITodoAppTaskTag.ISummary> {
  const { todoUser, body } = props;

  // includeDeleted is admin-only; this endpoint receives only a todoUser actor.
  // Reject if client explicitly asks for deleted rows.
  if (body.includeDeleted) {
    throw new HttpException(
      "Forbidden: includeDeleted requires admin privileges",
      403,
    );
  }

  // Pagination normalization (business logic): defaults and safe bounds
  const page = Math.max(1, Number(body.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(body.pageSize ?? 20)));
  const skip = (page - 1) * pageSize;

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.todo_app_task_tags.findMany({
        where: {
          ...(body.q !== undefined &&
            body.q !== null && { name: { contains: body.q } }),
          ...((body.createdAfter !== undefined && body.createdAfter !== null) ||
          (body.createdBefore !== undefined && body.createdBefore !== null)
            ? {
                created_at: {
                  ...(body.createdAfter !== undefined &&
                    body.createdAfter !== null && {
                      gte: toISOStringSafe(body.createdAfter),
                    }),
                  ...(body.createdBefore !== undefined &&
                    body.createdBefore !== null && {
                      lte: toISOStringSafe(body.createdBefore),
                    }),
                },
              }
            : {}),
          ...(body.includeDeleted ? {} : { deleted_at: null }),
        },
        orderBy:
          body.sortBy === "createdAt"
            ? { created_at: body.order === "desc" ? "desc" : "asc" }
            : { name: body.order === "desc" ? "desc" : "asc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      }),
      MyGlobal.prisma.todo_app_task_tags.count({
        where: {
          ...(body.q !== undefined &&
            body.q !== null && { name: { contains: body.q } }),
          ...((body.createdAfter !== undefined && body.createdAfter !== null) ||
          (body.createdBefore !== undefined && body.createdBefore !== null)
            ? {
                created_at: {
                  ...(body.createdAfter !== undefined &&
                    body.createdAfter !== null && {
                      gte: toISOStringSafe(body.createdAfter),
                    }),
                  ...(body.createdBefore !== undefined &&
                    body.createdBefore !== null && {
                      lte: toISOStringSafe(body.createdBefore),
                    }),
                },
              }
            : {}),
          ...(body.includeDeleted ? {} : { deleted_at: null }),
        },
      }),
    ]);

    const data = rows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      name: r.name,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: toISOStringSafe(r.updated_at),
      deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    }));

    return {
      pagination: {
        current: Number(page),
        limit: Number(pageSize),
        records: total,
        pages: Math.ceil(total / Number(pageSize)),
      },
      data,
    };
  } catch (err) {
    console.error("patchTodoAppTodoUserTaskTags failed", {
      err,
      userId: todoUser.id,
    });
    throw new HttpException("Internal Server Error", 500);
  }
}
