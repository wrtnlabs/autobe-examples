import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetToken";
import { IPageITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListPasswordResetToken";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserPasswordResetTokens(props: {
  user: UserPayload;
  body: ITodoListPasswordResetToken.IRequest;
}): Promise<IPageITodoListPasswordResetToken.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const nowISO = new Date().toISOString();

  const [tokens, total] = await Promise.all([
    MyGlobal.prisma.todo_list_password_reset_tokens.findMany({
      where: {
        ...(props.body.user_id && { todo_list_user_id: props.body.user_id }),
        ...(props.body.email && { email: props.body.email }),
        ...(props.body.is_expired !== undefined && {
          expires_at: props.body.is_expired ? { lt: nowISO } : { gte: nowISO },
        }),
        ...(props.body.is_used !== undefined && {
          used_at: props.body.is_used ? { not: null } : null,
        }),
        ...((props.body.created_after || props.body.created_before) && {
          created_at: {
            ...(props.body.created_after && { gte: props.body.created_after }),
            ...(props.body.created_before && {
              lte: props.body.created_before,
            }),
          },
        }),
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
    }),
    MyGlobal.prisma.todo_list_password_reset_tokens.count({
      where: {
        ...(props.body.user_id && { todo_list_user_id: props.body.user_id }),
        ...(props.body.email && { email: props.body.email }),
        ...(props.body.is_expired !== undefined && {
          expires_at: props.body.is_expired ? { lt: nowISO } : { gte: nowISO },
        }),
        ...(props.body.is_used !== undefined && {
          used_at: props.body.is_used ? { not: null } : null,
        }),
        ...((props.body.created_after || props.body.created_before) && {
          created_at: {
            ...(props.body.created_after && { gte: props.body.created_after }),
            ...(props.body.created_before && {
              lte: props.body.created_before,
            }),
          },
        }),
      },
    }),
  ]);

  return {
    data: tokens.map((token) => ({
      id: token.id,
      todo_list_user_id: token.todo_list_user_id,
      token: token.token,
      email: token.email,
      created_at: toISOStringSafe(token.created_at),
      expires_at: toISOStringSafe(token.expires_at),
      used_at: token.used_at ? toISOStringSafe(token.used_at) : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
