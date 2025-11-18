import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postAuthUserPasswordResetRequest(props: {
  body: ITodoListUser.IResetPasswordRequest;
}): Promise<ITodoListUser.IResetPasswordRequestResult> {
  const now = toISOStringSafe(new Date());
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
      locked: false,
    },
  });

  if (user !== null && user.is_verified) {
    await MyGlobal.prisma.todo_list_users.update({
      where: { id: user.id },
      data: {
        reset_password_token: v4(),
        reset_password_sent_at: now,
      },
    });
    // (Optional) Email notification logic is out of scope here.
  }

  return { success: true };
}
