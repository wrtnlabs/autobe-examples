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

export async function putTodoListUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  const existingUser = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });

  if (!existingUser || existingUser.deleted_at !== null) {
    throw new HttpException("User not found", 404);
  }

  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only update your own account",
      403,
    );
  }

  if (
    props.body.email !== undefined &&
    props.body.email !== existingUser.email
  ) {
    const emailExists = await MyGlobal.prisma.todo_list_users.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.userId },
        deleted_at: null,
      },
    });

    if (emailExists) {
      throw new HttpException("Email already in use", 409);
    }
  }

  const updatedUser = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: {
      ...(props.body.email !== undefined && { email: props.body.email }),
      ...(props.body.password !== undefined && {
        password_hash: await PasswordUtil.hash(props.body.password),
      }),
      updated_at: new Date(),
    },
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    email_verified: updatedUser.email_verified,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
    deleted_at:
      updatedUser.deleted_at === null
        ? undefined
        : toISOStringSafe(updatedUser.deleted_at),
  };
}
