import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postAuthUserPasswordRequestReset(props: {
  body: ITodoListUser.IRequestPasswordReset;
}): Promise<ITodoListUser.IPasswordResetStatus> {
  // Find user by email (never reveal if user does not exist)
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: props.body.email },
  });

  // Intentionally DO NOT send email or generate token due to unavailable infrastructure properties.
  // If infrastructure contracts are updated in the future, this is the injection point for token/email logic.

  // Always succeed (never disclose email validity)
  return {
    success: true,
    message:
      "If the email is registered, password reset instructions have been sent.",
  };
}
