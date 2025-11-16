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
  const page =
    props.body.page === null ||
    props.body.page === undefined ||
    props.body.page < 1
      ? 1
      : props.body.page;
  const limit =
    props.body.limit === null ||
    props.body.limit === undefined ||
    props.body.limit < 1
      ? 20
      : props.body.limit;
  const skip = (page - 1) * limit;

  const where = {
    email: props.body.email ?? undefined,
    created_at:
      props.body.created_at_start || props.body.created_at_end
        ? {
            ...(props.body.created_at_start
              ? { gte: props.body.created_at_start }
              : {}),
            ...(props.body.created_at_end
              ? { lte: props.body.created_at_end }
              : {}),
          }
        : undefined,
    updated_at:
      props.body.updated_at_start || props.body.updated_at_end
        ? {
            ...(props.body.updated_at_start
              ? { gte: props.body.updated_at_start }
              : {}),
            ...(props.body.updated_at_end
              ? { lte: props.body.updated_at_end }
              : {}),
          }
        : undefined,
  };

  const [users, total] = await Promise.all([
    MyGlobal.prisma.todo_list_users.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.todo_list_users.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: users.map((user) => ({
      id: user.id,
      username: "",
      display_name: "",
      joined_at: toISOStringSafe(user.created_at),
    })),
  };
}
