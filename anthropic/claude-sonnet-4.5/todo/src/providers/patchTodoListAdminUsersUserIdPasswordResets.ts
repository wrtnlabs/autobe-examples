import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import { IPageITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminUsersUserIdPasswordResets(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListPasswordReset.IRequest;
}): Promise<IPageITodoListPasswordReset.ISummary> {
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  if (props.body.email !== undefined && props.body.email !== user.email) {
    return {
      pagination: {
        current: props.body.page ?? 1,
        limit: props.body.limit ?? 100,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    todo_list_user_id: props.userId,
  };

  if (props.body.used !== undefined) {
    whereCondition.used = props.body.used;
  }

  if (
    props.body.created_after !== undefined ||
    props.body.created_before !== undefined
  ) {
    const createdAtCondition: Record<string, unknown> = {};
    if (props.body.created_after !== undefined) {
      createdAtCondition.gte = new Date(props.body.created_after);
    }
    if (props.body.created_before !== undefined) {
      createdAtCondition.lte = new Date(props.body.created_before);
    }
    whereCondition.created_at = createdAtCondition;
  }

  if (
    props.body.expires_after !== undefined ||
    props.body.expires_before !== undefined
  ) {
    const expiresAtCondition: Record<string, unknown> = {};
    if (props.body.expires_after !== undefined) {
      expiresAtCondition.gte = new Date(props.body.expires_after);
    }
    if (props.body.expires_before !== undefined) {
      expiresAtCondition.lte = new Date(props.body.expires_before);
    }
    whereCondition.expires_at = expiresAtCondition;
  }

  const [passwordResets, total] = await Promise.all([
    MyGlobal.prisma.todo_list_password_resets.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy:
        props.body.sort === "created_at_asc"
          ? { created_at: Prisma.SortOrder.asc }
          : props.body.sort === "expires_at_asc"
            ? { expires_at: Prisma.SortOrder.asc }
            : props.body.sort === "expires_at_desc"
              ? { expires_at: Prisma.SortOrder.desc }
              : { created_at: Prisma.SortOrder.desc },
    }),
    MyGlobal.prisma.todo_list_password_resets.count({
      where: whereCondition,
    }),
  ]);

  const data = passwordResets.map((reset) => ({
    id: reset.id,
    todo_list_user_id: reset.todo_list_user_id,
    email: user.email,
    token: reset.token,
    created_at: toISOStringSafe(reset.created_at),
    expires_at: toISOStringSafe(reset.expires_at),
    used: reset.used,
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
