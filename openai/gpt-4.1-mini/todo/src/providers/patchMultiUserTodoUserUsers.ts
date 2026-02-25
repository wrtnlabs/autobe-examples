import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoUserUsers(props: {
  user: UserPayload;
  body: IMultiUserTodoUser.IRequest;
}): Promise<IPageIMultiUserTodoUser.ISummary> {
  if (props.user.type !== "user") {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const where: Prisma.multi_user_todo_usersWhereInput = {
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email },
    }),
    ...(props.body.displayName !== undefined && {
      display_name: { contains: props.body.displayName },
    }),
    ...(props.body.accountStatus === "active" && { deleted_at: null }),
    ...(props.body.accountStatus === "deleted" && {
      deleted_at: { not: null },
    }),
    ...(props.body.accountStatus === "all" ? {} : {}),
    ...(props.body.registrationStart !== undefined && {
      created_at: { gte: props.body.registrationStart },
    }),
    ...(props.body.registrationEnd !== undefined && {
      created_at: {
        ...(props.body.registrationStart !== undefined
          ? { gte: props.body.registrationStart }
          : {}),
        lte: props.body.registrationEnd,
      },
    }),
  };
  const orderBy: Prisma.multi_user_todo_usersOrderByWithRelationInput = (
    props.body.sortBy === "email"
      ? { email: props.body.sortOrder ?? "asc" }
      : props.body.sortBy === "displayName"
        ? { display_name: props.body.sortOrder ?? "asc" }
        : { created_at: "desc" }
  ) satisfies Prisma.multi_user_todo_usersOrderByWithRelationInput;
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_users.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.multi_user_todo_users.count({ where }),
  ]);
  return {
    data: data.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      createdAt: toISOStringSafe(user.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(user.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: user.deleted_at
        ? (toISOStringSafe(user.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
