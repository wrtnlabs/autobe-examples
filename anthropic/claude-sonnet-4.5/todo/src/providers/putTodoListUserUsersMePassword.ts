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

export async function putTodoListUserUsersMePassword(props: {
  user: UserPayload;
  body: ITodoListUser.IChangePassword;
}): Promise<void> {
  const { user, body } = props;

  const currentUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: user.id,
      deleted_at: null,
    },
  });

  if (!currentUser) {
    throw new HttpException("User not found", 404);
  }

  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.current_password,
    currentUser.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  const newPasswordHash = await PasswordUtil.hash(body.new_password);

  await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
