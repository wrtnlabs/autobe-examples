import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function patchTodoListGuestTodoListUsers(props: {
  guest: GuestPayload;
  body: ITodoListUser.IRequest;
}): Promise<IPageITodoListUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;

  // Inline Prisma where condition with object spread for clarity
  const where = {
    deleted_at: props.body.status === "deleted" ? { not: null } : null,
    ...(props.body.search && {
      email: {
        contains: props.body.search,
        mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
      },
    }),
  };

  // Inline Prisma orderBy condition
  const orderBy =
    props.body.sort_by === "email"
      ? {
          email: (props.body.order === "desc"
            ? "desc"
            : "asc") satisfies Prisma.SortOrder as Prisma.SortOrder,
        }
      : props.body.sort_by === "created_at"
        ? {
            created_at: (props.body.order === "desc"
              ? "desc"
              : "asc") satisfies Prisma.SortOrder as Prisma.SortOrder,
          }
        : { created_at: "desc" satisfies Prisma.SortOrder as Prisma.SortOrder }; // default

  // Execute counts and queries
  const [users, total] = await Promise.all([
    MyGlobal.prisma.todo_list_users.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_users.count({ where }),
  ]);

  // Map to summary format with proper date-time strings
  const data = users.map((user) => ({
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
