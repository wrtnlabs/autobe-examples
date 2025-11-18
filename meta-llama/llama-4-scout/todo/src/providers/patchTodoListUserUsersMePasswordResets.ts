import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserPasswordReset";
import { IPageITodoListUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsersMePasswordResets(props: {
  user: UserPayload;
  body: ITodoListUserPasswordReset.IRequest;
}): Promise<IPageITodoListUserPasswordReset.ISummary> {
  // Pagination parameters
  const limit: number = 20; // Default per-page limit
  const page: number = 1;
  const skip = (page - 1) * limit;

  // Find total count of this user's reset log
  const total: number =
    await MyGlobal.prisma.todo_list_user_password_resets.count({
      where: { todo_list_user_id: props.user.id },
    });

  // Fetch records with latest first
  const resets = await MyGlobal.prisma.todo_list_user_password_resets.findMany({
    where: { todo_list_user_id: props.user.id },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: resets.map((item) => ({
      id: item.id,
      todo_list_user_id: item.todo_list_user_id,
      reset_token: item.reset_token,
      consumed_at:
        typeof item.consumed_at === "object" && item.consumed_at !== null
          ? toISOStringSafe(item.consumed_at)
          : item.consumed_at === null
            ? null
            : undefined,
      expires_at: toISOStringSafe(item.expires_at),
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
