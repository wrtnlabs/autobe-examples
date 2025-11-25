import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Authorization check - user can only delete their own account
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only delete your own account", 403);
  }

  const now = toISOStringSafe(new Date());

  // Perform all deletion operations in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Soft delete the user account
    await tx.todo_app_users.update({
      where: { id: props.userId },
      data: {
        deleted_at: now,
        status: "inactive",
        updated_at: now,
      },
    });

    // 2. Invalidate all user sessions
    await tx.todo_app_sessions.updateMany({
      where: {
        todo_app_user_id: props.userId,
        is_valid: true,
      },
      data: {
        is_valid: false,
      },
    });

    // 3. Soft delete all user tasks
    await tx.todo_app_tasks.updateMany({
      where: {
        todo_app_user_id: props.userId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
}
