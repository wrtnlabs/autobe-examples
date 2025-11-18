import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  // Only allow users to delete their own accounts
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "You are not permitted to delete another user's account.",
      403,
    );
  }

  // Ensure the user exists and is not already deleted
  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });
  if (!existing) {
    throw new HttpException("User not found or already deleted.", 404);
  }

  // Hard delete the user; schema-level cascade cleans up related records
  await MyGlobal.prisma.todo_list_users.delete({
    where: {
      id: props.userId,
    },
  });
}
