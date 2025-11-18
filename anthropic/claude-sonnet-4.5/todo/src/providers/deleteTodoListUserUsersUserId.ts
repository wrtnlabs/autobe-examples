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

export async function deleteTodoListUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoListUser> {
  // Authorization: User can only delete their own account
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only delete your own account",
      403,
    );
  }

  // Find the user to verify existence and current state
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Check if user is already soft-deleted
  if (user.deleted_at !== null) {
    throw new HttpException("User account is already deleted", 404);
  }

  // Perform soft delete by setting deleted_at timestamp
  const now = new Date();
  const deletedUser = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // Return the soft-deleted user with proper type conversions
  return {
    id: deletedUser.id,
    email: deletedUser.email,
    name: deletedUser.name === null ? undefined : deletedUser.name,
    created_at: toISOStringSafe(deletedUser.created_at),
    updated_at: toISOStringSafe(deletedUser.updated_at),
    deleted_at: toISOStringSafe(now),
  };
}
