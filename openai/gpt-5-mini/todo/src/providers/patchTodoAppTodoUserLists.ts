import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { IPageITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppList";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function patchTodoAppTodoUserLists(props: {
  todoUser: TodouserPayload;
  page: number & tags.Type<"int32">;
  limit: number & tags.Type<"int32">;
  query: string & tags.MaxLength<256>;
  visibility: string;
  scope: string;
  sortBy: string;
  order: string;
  includeDeleted: string;
  body: ITodoAppList.IRequest;
}): Promise<IPageITodoAppList.ISummary> {
  const { todoUser, body } = props;

  // Pagination: normalize inputs
  const page = Number(props.page ?? body.page ?? 1);
  const limit = Math.min(Number(props.limit ?? body.limit ?? 20), 200);

  if (page < 1) throw new HttpException("Bad Request: page must be >= 1", 400);
  if (limit < 1)
    throw new HttpException("Bad Request: limit must be >= 1", 400);

  // Validate enums
  const allowedVisibilities = ["private", "shared-invite-only", "public"];
  const allowedScopes = ["owned", "collaborating", "public"];
  const allowedSortBy = ["createdAt", "title"];
  const allowedOrder = ["asc", "desc"];

  const visibility = props.visibility ?? body.visibility;
  if (visibility !== undefined && !allowedVisibilities.includes(visibility))
    throw new HttpException("Bad Request: invalid visibility", 400);

  const scope = props.scope ?? body.scope;
  if (scope !== undefined && !allowedScopes.includes(scope))
    throw new HttpException("Bad Request: invalid scope", 400);

  const sortBy = props.sortBy ?? body.sortBy ?? "createdAt";
  if (!allowedSortBy.includes(sortBy))
    throw new HttpException("Bad Request: invalid sortBy", 400);

  const order = props.order ?? body.order ?? "asc";
  if (!allowedOrder.includes(order))
    throw new HttpException("Bad Request: invalid order", 400);

  const rawQuery = (props.query ?? body.query) as string | undefined;
  const query = rawQuery && rawQuery.length > 0 ? rawQuery : undefined;
  if (query !== undefined && query.length > 256)
    throw new HttpException("Bad Request: query too long", 400);

  const includeDeleted = (props.includeDeleted ?? undefined) === "true";

  // Authorization requirement for scoped queries
  if ((scope === "owned" || scope === "collaborating") && !todoUser) {
    throw new HttpException("Unauthorized", 401);
  }

  // Build where condition carefully
  const whereCondition: Record<string, unknown> = {
    ...(includeDeleted ? {} : { deleted_at: null }),
    ...(visibility !== undefined && { visibility }),
    ...(query !== undefined && {
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
      ],
    }),
    ...(scope === "owned" && todoUser && { todo_app_todouser_id: todoUser.id }),
    ...(scope === "collaborating" && todoUser
      ? {
          todo_app_list_collaborators: {
            some: {
              todo_app_todouser_id: todoUser.id,
              deleted_at: null,
              accepted_at: { not: null },
            },
          },
        }
      : {}),
    ...(scope === "public" && { visibility: "public" }),
  };

  const skip = (page - 1) * limit;

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.todo_app_lists.findMany({
        where: whereCondition,
        include: {
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
        orderBy:
          sortBy === "createdAt"
            ? { created_at: order === "asc" ? "asc" : "desc" }
            : { title: order === "asc" ? "asc" : "desc" },
        skip,
        take: limit,
      }),
      MyGlobal.prisma.todo_app_lists.count({ where: whereCondition }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      title: r.title,
      visibility: r.visibility,
      owner: {
        id: r.owner.id,
        displayName: r.owner.display_name ?? null,
        isVerified: r.owner.is_verified,
        status: r.owner.status ?? undefined,
        createdAt: toISOStringSafe(r.owner.created_at),
        updatedAt: toISOStringSafe(r.owner.updated_at),
      },
      description: r.description ?? null,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: toISOStringSafe(r.updated_at),
      deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    })) as ITodoAppList.ISummary[];

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
