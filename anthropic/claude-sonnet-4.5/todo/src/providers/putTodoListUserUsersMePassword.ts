import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserUsersMePassword(props: {
  user: UserPayload;
  body: ITodoListUser.IChangePassword;
}): Promise<ITodoListUser.IPasswordChanged> {
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

  const newPasswordHash = await PasswordUtil.hash(props.body.new_password);

  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.todo_list_users.update({
      where: { id: props.user.id },
      data: {
        password_hash: newPasswordHash,
        updated_at: new Date(),
      },
    });

    await tx.todo_list_user_sessions.updateMany({
      where: {
        todo_list_user_id: props.user.id,
        id: { not: props.user.session_id },
        expired_at: null,
      },
      data: {
        expired_at: new Date(),
      },
    });
  });

  return {
    success: true,
    message:
      "Password changed successfully. You have been logged out of all other devices.",
  };
}
