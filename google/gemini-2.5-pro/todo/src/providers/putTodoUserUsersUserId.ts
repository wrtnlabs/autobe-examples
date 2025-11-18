import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoUser.IUpdate;
}): Promise<ITodoUser> {
  // Only allow the user to modify their own data
  if (props.user.id !== props.userId) {
    throw new HttpException("You are not authorized to modify this user.", 403);
  }
  const existing = await MyGlobal.prisma.todo_users.findUnique({
    where: { id: props.userId },
  });
  if (!existing) {
    throw new HttpException("User not found.", 404);
  }
  // Email uniqueness check if email is changing
  if (props.body.email && props.body.email !== existing.email) {
    const emailTaken = await MyGlobal.prisma.todo_users.findUnique({
      where: { email: props.body.email },
    });
    if (emailTaken) {
      throw new HttpException("Email address is already in use.", 409);
    }
  }
  // Build update data (never include Date type)
  const updateData: { email?: string; password_hash?: string } = {};
  if (props.body.email !== undefined) {
    updateData.email = props.body.email;
  }
  if (props.body.password !== undefined) {
    updateData.password_hash = await PasswordUtil.hash(props.body.password);
  }
  const updated = await MyGlobal.prisma.todo_users.update({
    where: { id: props.userId },
    data: updateData,
  });
  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
