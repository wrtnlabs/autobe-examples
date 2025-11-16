import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserPasswordChange(props: {
  user: UserPayload;
  body: ITodoListUser.IChangePassword;
}): Promise<ITodoListUser.IChangePasswordResult> {
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.user.id },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  const isCurrentPasswordValid = await PasswordUtil.verify(
    props.body.current_password,
    user.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  const hashedNewPassword = await PasswordUtil.hash(props.body.new_password);

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.user.id },
    data: {
      password_hash: hashedNewPassword,
      updated_at: now,
    },
  });

  await MyGlobal.prisma.todo_list_user_sessions.updateMany({
    where: {
      todo_list_user_id: props.user.id,
      id: { not: props.user.session_id },
      expired_at: null,
    },
    data: {
      expired_at: now,
    },
  });

  return {
    success: true,
    message:
      "Password has been successfully changed. Other sessions have been invalidated for security.",
  };
}
