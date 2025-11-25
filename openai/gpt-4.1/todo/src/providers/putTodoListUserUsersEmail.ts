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

export async function putTodoListUserUsersEmail(props: {
  user: UserPayload;
  email: string & tags.Format<"email">;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  // Find the user by email.
  const userRecord = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: props.email },
  });
  if (!userRecord) {
    throw new HttpException("User not found.", 404);
  }

  // Enforce self-ownership: only the user themself can change their password.
  if (userRecord.id !== props.user.id) {
    throw new HttpException(
      "You are not permitted to update another user's account.",
      403,
    );
  }

  // Hash new password securely
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Update password and system-managed updated_at
  const updatedUser = await MyGlobal.prisma.todo_list_users.update({
    where: { email: props.email },
    data: {
      password_hash: hashedPassword,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Construct and return ITodoListUser profile
  return {
    id: updatedUser.id,
    email: updatedUser.email,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
  };
}
