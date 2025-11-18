import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserPasswordReset";

export async function postAuthUserRequestPasswordReset(props: {
  body: ITodoListUserPasswordReset.IRequest;
}): Promise<ITodoListUserPasswordReset.IRequested> {
  const email = props.body.email.trim().toLowerCase();
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email },
  });

  if (user && user.is_active && user.is_verified && user.deleted_at === null) {
    const now = Date.now();
    const nowString = toISOStringSafe(new Date(now));
    const expiresString = toISOStringSafe(new Date(now + 60 * 60 * 1000));

    // Rate limit: allow at most one active (unredeemed, unexpired, recent) request per 15 minutes
    const earliestAllowed = toISOStringSafe(new Date(now - 15 * 60 * 1000));
    const recentReset =
      await MyGlobal.prisma.todo_list_user_password_resets.findFirst({
        where: {
          todo_list_user_id: user.id,
          created_at: { gte: earliestAllowed },
          consumed_at: null,
          expires_at: { gt: nowString },
        },
      });
    if (!recentReset) {
      await MyGlobal.prisma.todo_list_user_password_resets.create({
        data: {
          id: v4(),
          todo_list_user_id: user.id,
          reset_token: v4(),
          consumed_at: null,
          expires_at: expiresString,
          created_at: nowString,
        },
      });
      // In production: trigger external email send with reset_token
    }
  }
  return {
    message:
      "If an account with this email exists, a reset link has been sent.",
  };
}
