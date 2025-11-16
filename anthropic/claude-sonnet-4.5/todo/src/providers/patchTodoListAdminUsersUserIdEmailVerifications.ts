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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminUsersUserIdEmailVerifications(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListEmailVerification.IRequest;
}): Promise<IPageITodoListEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const now = new Date();

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_email_verifications.findMany({
      where: {
        todo_list_user_id: props.userId,
        ...(props.body.verified !== undefined &&
          props.body.verified !== null && {
            verified: props.body.verified,
          }),
        ...(props.body.expired === true && {
          expires_at: { lt: now },
        }),
        ...(props.body.expired === false && {
          expires_at: { gte: now },
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
      orderBy: {
        [props.body.sort_by ?? "created_at"]: props.body.order ?? "desc",
      },
    }),
    MyGlobal.prisma.todo_list_email_verifications.count({
      where: {
        todo_list_user_id: props.userId,
        ...(props.body.verified !== undefined &&
          props.body.verified !== null && {
            verified: props.body.verified,
          }),
        ...(props.body.expired === true && {
          expires_at: { lt: now },
        }),
        ...(props.body.expired === false && {
          expires_at: { gte: now },
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

  return {
    data: data.map((record) => ({
      id: record.id,
      todo_list_user_id: record.todo_list_user_id,
      created_at: toISOStringSafe(record.created_at),
      expires_at: toISOStringSafe(record.expires_at),
      verified: record.verified,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
