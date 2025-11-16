import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import { IPageITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListEmailVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsersUserIdEmailVerifications(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListEmailVerification.IRequest;
}): Promise<IPageITodoListEmailVerification.ISummary> {
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only access your own email verification records",
      403,
    );
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";
  const currentTime = toISOStringSafe(new Date());

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_email_verifications.findMany({
      where: {
        todo_list_user_id: props.userId,
        ...(props.body.verified !== undefined &&
          props.body.verified !== null && {
            verified: props.body.verified,
          }),
        ...(props.body.expired !== undefined &&
          props.body.expired !== null && {
            expires_at: props.body.expired
              ? { lt: currentTime }
              : { gte: currentTime },
          }),
        ...(props.body.search && {
          todo_list_users: {
            email: {
              contains: props.body.search,
            },
          },
        }),
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
    }),
    MyGlobal.prisma.todo_list_email_verifications.count({
      where: {
        todo_list_user_id: props.userId,
        ...(props.body.verified !== undefined &&
          props.body.verified !== null && {
            verified: props.body.verified,
          }),
        ...(props.body.expired !== undefined &&
          props.body.expired !== null && {
            expires_at: props.body.expired
              ? { lt: currentTime }
              : { gte: currentTime },
          }),
        ...(props.body.search && {
          todo_list_users: {
            email: {
              contains: props.body.search,
            },
          },
        }),
      },
    }),
  ]);

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data: data.map((record) => ({
      id: record.id,
      todo_list_user_id: record.todo_list_user_id,
      created_at: toISOStringSafe(record.created_at),
      expires_at: toISOStringSafe(record.expires_at),
      verified: record.verified,
    })),
  };
}
