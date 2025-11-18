import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";
import { IPageITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodoListUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTodoListUsers(props: {
  user: UserPayload;
  body: ITodoListTodoListUser.IRequest;
}): Promise<IPageITodoListTodoListUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Fix: use Prisma.todo_list_usersWhereInput[] instead of faulty type
  const andFilters: Prisma.todo_list_usersWhereInput[] = [];

  if (props.body.is_active !== undefined) {
    andFilters.push({
      deleted_at: props.body.is_active ? null : { not: null },
    });
  }

  if (props.body.search) {
    andFilters.push({
      email: { contains: props.body.search, mode: "insensitive" },
    });
  }

  if (props.body.created_from || props.body.created_to) {
    const gte = props.body.created_from
      ? toISOStringSafe(props.body.created_from)
      : undefined;
    const lte = props.body.created_to
      ? toISOStringSafe(props.body.created_to)
      : undefined;
    andFilters.push({
      created_at: {
        ...(gte ? { gte } : {}),
        ...(lte ? { lte } : {}),
      },
    });
  }

  const where: Prisma.todo_list_usersWhereInput = { AND: andFilters };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_users.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
      },
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_list_users.count({ where }),
  ]);

  return {
    data: data.map((user) => ({
      id: user.id,
      email: user.email,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
