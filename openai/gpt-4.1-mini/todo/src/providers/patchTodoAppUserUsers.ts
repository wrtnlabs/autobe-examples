import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserUsers(props: {
  user: UserPayload;
  body: ITodoAppUser.IRequest;
}): Promise<IPageITodoAppUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null as null,
    ...(props.body.username
      ? { username: { contains: props.body.username } }
      : {}),
    ...(props.body.email ? { email: props.body.email } : {}),
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.createdAtStart || props.body.createdAtEnd
      ? {
          created_at: {
            ...(props.body.createdAtStart
              ? { gte: props.body.createdAtStart }
              : {}),
            ...(props.body.createdAtEnd
              ? { lte: props.body.createdAtEnd }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.todo_app_usersWhereInput;
  const [total, users] = await Promise.all([
    MyGlobal.prisma.todo_app_users.count({ where }),
    MyGlobal.prisma.todo_app_users.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
  ]);
  return {
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: users.map((user) => ({
      id: user.id as string & tags.Format<"uuid">,
      email: user.email as string & tags.Format<"email">,
      username: user.username,
      created_at: toISOStringSafe(user.created_at),
      updated_at:
        user.updated_at === null ? null : toISOStringSafe(user.updated_at),
      deleted_at:
        user.deleted_at === null ? null : toISOStringSafe(user.deleted_at),
    })),
  };
}
