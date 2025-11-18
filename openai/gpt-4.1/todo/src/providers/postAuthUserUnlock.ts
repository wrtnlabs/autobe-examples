import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postAuthUserUnlock(props: {
  body: ITodoListUser.IUnlock;
}): Promise<ITodoListUser.IUnlockResult> {
  // Find user by email (lowercase, strict match)
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: props.body.email },
  });

  if (!user) {
    return {
      success: false,
      message: "No user found for the provided email address.",
      can_login: false,
      next_step: "Check your email address or contact support.",
    };
  }

  if (!user.locked || !user.locked_at) {
    return {
      success: false,
      message: "Account is not locked.",
      can_login: true,
      next_step: undefined,
    };
  }

  // Treat reset_password_token as the unlock token
  if (
    !user.reset_password_token ||
    user.reset_password_token !== props.body.unlock_token
  ) {
    return {
      success: false,
      message: "Unlock token is invalid, expired, or already used.",
      can_login: false,
      next_step: "Request a new unlock token or contact support.",
    };
  }

  // Unlock account: reset locked/locked_at and clear unlock token
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: {
      locked: false,
      locked_at: null,
      reset_password_token: null,
      reset_password_sent_at: null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    success: true,
    message: "Account successfully unlocked. You may now log in.",
    can_login: true,
    next_step: undefined,
  };
}
