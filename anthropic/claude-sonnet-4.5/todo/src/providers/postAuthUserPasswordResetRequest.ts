import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";

export async function postAuthUserPasswordResetRequest(props: {
  body: ITodoListPasswordReset.IRequest;
}): Promise<ITodoListPasswordReset.IRequestResult> {
  const email = props.body.email;

  if (!email) {
    return {
      message:
        "If an account exists with this email address, password reset instructions have been sent.",
    };
  }

  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email },
  });

  if (user) {
    const tokenId = v4() as string & tags.Format<"uuid">;
    const tokenValue = v4() as string & tags.Format<"uuid">;
    const currentTime = toISOStringSafe(new Date());
    const expirationTime = toISOStringSafe(
      new Date(Date.now() + 60 * 60 * 1000),
    );

    await MyGlobal.prisma.todo_list_password_resets.create({
      data: {
        id: tokenId,
        todo_list_user_id: user.id,
        token: tokenValue,
        used: false,
        expires_at: expirationTime,
        created_at: currentTime,
      },
    });
  }

  return {
    message:
      "If an account exists with this email address, password reset instructions have been sent.",
  };
}
