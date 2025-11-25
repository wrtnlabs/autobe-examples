import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the target user by userId and ensure they are not already soft deleted
  const target = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });

  if (!target || target.deleted_at !== null) {
    throw new HttpException("User not found or has already been deleted.", 404);
  }

  // Only allow the user themselves to delete their own account
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "You do not have permission to delete this user.",
      403,
    );
  }

  // Set deleted_at to now (string & tags.Format<'date-time'>)
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // Return void
}
