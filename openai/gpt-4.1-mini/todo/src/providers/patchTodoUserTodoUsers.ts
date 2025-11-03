import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IPageITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserTodoUsers(props: {
  user: UserPayload;
  body: ITodoUser.IRequest;
}): Promise<IPageITodoUser.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        email: {
          contains: body.search,
        },
      }),
  };

  const orderBy =
    body.sortBy === "email"
      ? {
          email: (body.sortOrder === "asc"
            ? "asc"
            : "desc") as Prisma.SortOrder,
        }
      : body.sortBy === "created_at"
        ? {
            created_at: (body.sortOrder === "asc"
              ? "asc"
              : "desc") as Prisma.SortOrder,
          }
        : body.sortBy === "updated_at"
          ? {
              updated_at: (body.sortOrder === "asc"
                ? "asc"
                : "desc") as Prisma.SortOrder,
            }
          : { created_at: "desc" as Prisma.SortOrder };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.todo_users.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.todo_users.count({ where }),
  ]);

  const data: ITodoUser.ISummary[] = results.map((user) => ({
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
  }));

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
