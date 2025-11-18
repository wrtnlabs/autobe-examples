import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserPasswordChange(props: {
  user: UserPayload;
  body: ITodoListTodoListUser.IChangePassword;
}): Promise<void> {
  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.user.id },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("User not found", 404);
  }

  if (
    !(await PasswordUtil.verify(
      props.body.currentPassword,
      existing.password_hash,
    ))
  ) {
    throw new HttpException("Current password is incorrect", 400);
  }

  const newHashedPassword = await PasswordUtil.hash(props.body.newPassword);

  await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.user.id },
    data: {
      password_hash: newHashedPassword,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
