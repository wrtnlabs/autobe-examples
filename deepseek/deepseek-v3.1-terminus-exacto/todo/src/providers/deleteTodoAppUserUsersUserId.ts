import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the target user exists and is not deleted
  const targetUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId, deleted_at: null },
  });

  if (!targetUser) {
    throw new HttpException("User not found", 404);
  }

  // Check authorization: users can only delete their own accounts
  if (targetUser.id !== props.user.id) {
    throw new HttpException("You can only delete your own account", 403);
  }

  // Perform hard deletion - Prisma will handle cascade deletes
  await MyGlobal.prisma.todo_app_users.delete({
    where: { id: props.userId },
  });
}
