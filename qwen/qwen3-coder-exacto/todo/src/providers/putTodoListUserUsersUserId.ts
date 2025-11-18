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
  // 1. Ownership enforcement
  if (props.user.id !== props.userId) {
    throw new HttpException("You may only update your own profile.", 403);
  }
  // 2. Find user; throw if not found
  const dbUser = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });
  if (!dbUser) {
    throw new HttpException("User not found.", 404);
  }
  // 3. Uniqueness check if email will change
  if (props.body.email && props.body.email !== dbUser.email) {
    const sameEmail = await MyGlobal.prisma.todo_list_users.findFirst({
      where: { email: props.body.email },
    });
    if (sameEmail) {
      throw new HttpException("Email already in use.", 409);
    }
  }
  // 4. Build update data
  let password_hash: string | undefined = undefined;
  if (props.body.password) {
    password_hash = await PasswordUtil.hash(props.body.password);
  }
  const updateData: Record<string, unknown> = {
    ...(props.body.email ? { email: props.body.email } : {}),
    ...(password_hash ? { password_hash } : {}),
    updated_at: toISOStringSafe(new Date()),
  };
  // 5. Update user
  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: updateData,
  });
  // 6. Return API DTO with correct typing and datetime conversion
  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
