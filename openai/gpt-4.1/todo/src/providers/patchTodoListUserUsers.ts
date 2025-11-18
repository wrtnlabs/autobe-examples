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
  // Extract parameters
  const { email, page, limit, order_by, order_dir } = props.body;
  const currentPage = page > 0 ? page : 1;
  const perPage = limit > 0 ? limit : 100;

  // Filter
  const where =
    email !== undefined
      ? {
          email: {
            equals: email satisfies string as string,
            mode: "insensitive" as Prisma.QueryMode,
          },
        }
      : {};

  // Order
  const orderBy = [{ [order_by]: order_dir }];

  // Pagination
  const skip = (currentPage - 1) * perPage;
  const take = perPage;

  // Query
  const [users, total] = await Promise.all([
    MyGlobal.prisma.todo_list_users.findMany({
      where,
      skip,
      take,
      orderBy,
      select: { id: true },
    }),
    MyGlobal.prisma.todo_list_users.count({ where }),
  ]);

  // Compose return
  return {
    pagination: {
      current: currentPage satisfies number as number,
      limit: perPage satisfies number as number,
      records: total,
      pages: Math.ceil(total / perPage),
    },
    data: users.map((u) => ({ id: u.id })),
  };
}
