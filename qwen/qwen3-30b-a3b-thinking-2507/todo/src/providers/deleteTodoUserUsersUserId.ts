import { ArrayUtil } from "@nestia/e2e";
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
  userId: string;
}): Promise<void> {
  // Verify current user is the one being deleted
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only delete your own account",
      403,
    );
  }
  // Verify the target user exists
  const existingUser = await MyGlobal.prisma.todo_users.findUnique({
    where: { id: props.userId },
  });
  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }
  // Perform hard delete
  await MyGlobal.prisma.todo_users.delete({
    where: { id: props.userId },
  });
}
