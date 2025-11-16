import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserAuthUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the user exists and matches the authenticated user
  const existingUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
  });

  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }

  // Authorization: user can only delete their own account
  if (props.user.id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }

  // Delete the user account - cascade will handle related data
  await MyGlobal.prisma.todo_app_users.delete({
    where: { id: props.userId },
  });
}
