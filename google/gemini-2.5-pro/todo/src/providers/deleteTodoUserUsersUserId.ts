import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Check if the user exists
  const existingUser = await MyGlobal.prisma.todo_users.findUnique({
    where: { id: props.userId },
  });
  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }

  // Step 2: Strict authorization: user can only delete their own account
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can delete only your own account.",
      403,
    );
  }

  // Step 3: Cascade delete related data for privacy compliance
  // Delete all todos
  await MyGlobal.prisma.todo_todos.deleteMany({
    where: { todo_user_id: props.userId },
  });

  // Delete all sessions for this user
  await MyGlobal.prisma.todo_user_sessions.deleteMany({
    where: { todo_user_id: props.userId },
  });

  // Step 4: Delete the user record
  await MyGlobal.prisma.todo_users.delete({
    where: { id: props.userId },
  });

  // Step 5: Done (void return)
}
