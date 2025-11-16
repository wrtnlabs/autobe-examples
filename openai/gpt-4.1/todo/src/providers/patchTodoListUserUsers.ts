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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsers(props: {
  user: UserPayload;
  body: ITodoListUser.IRequest;
}): Promise<IPageITodoListUser.ISummary> {
  const {
    email,
    page = 1,
    limit = 100,
    sort_by = "email",
    sort_order = "asc",
  } = props.body || {};

  const where = email ? { email: { contains: email } } : {};

  const orderBy: { [key: string]: "asc" | "desc" } = {};
  if (sort_by === "email") orderBy.email = sort_order;
  else orderBy.id = sort_order; // No created_at field as per schema

  const skip = (page - 1) * limit;

  const [total, users] = await Promise.all([
    MyGlobal.prisma.todo_list_users.count({ where }),
    MyGlobal.prisma.todo_list_users.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: users.map((row) => ({
      id: row.id,
      email: row.email,
    })),
  };
}
