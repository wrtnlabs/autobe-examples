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
  // Verify the requesting user owns the account being deleted
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only delete your own user account", 403);
  }

  // Check if the target user exists and is active
  const targetUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
      status: "active",
    },
  });

  if (!targetUser) {
    throw new HttpException("User account not found or already deleted", 404);
  }

  try {
    // Use transaction to ensure atomic deletion of user and sessions
    await MyGlobal.prisma.$transaction(async (prisma) => {
      // Delete all user sessions first
      await prisma.todo_list_user_sessions.deleteMany({
        where: {
          todo_list_user_id: props.userId,
        },
      });

      // Perform hard deletion of the user account
      await prisma.todo_list_users.delete({
        where: {
          id: props.userId,
        },
      });
    });
  } catch (error) {
    // Handle database errors gracefully
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new HttpException(
        "Failed to delete user account due to database error",
        500,
      );
    }
    throw error;
  }
}
