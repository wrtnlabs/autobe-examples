import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function putTodoListUserTodoListUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser.ISummary> {
  const existingUser = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });

  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }

  const updateData = {
    email: props.body.email,
    updated_at: toISOStringSafe(new Date()),
    ...(props.body.password !== undefined
      ? { password_hash: await PasswordUtil.hash(props.body.password) }
      : {}),
  };

  const updatedUser = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: updateData,
  });

  return {
    id: updatedUser.id as string & tags.Format<"uuid">,
    email: updatedUser.email,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
  };
}
