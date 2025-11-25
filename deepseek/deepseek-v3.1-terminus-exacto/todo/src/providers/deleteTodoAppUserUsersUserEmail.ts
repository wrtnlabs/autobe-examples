import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserUsersUserEmail(props: {
  user: UserPayload;
  userEmail: string & tags.Format<"email">;
}): Promise<ITodoAppUser> {
  // First, get the authenticated user's current data including email
  const authenticatedUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.user.id, deleted_at: null },
  });

  if (!authenticatedUser) {
    throw new HttpException("Authenticated user not found", 404);
  }

  // Verify the target email matches the authenticated user's email
  if (props.userEmail !== authenticatedUser.email) {
    throw new HttpException("You can only delete your own account", 403);
  }

  // Find the target user by email to ensure they exist
  const targetUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { email: props.userEmail, deleted_at: null },
  });

  if (!targetUser) {
    throw new HttpException("User not found", 404);
  }

  // Verify the user ID matches the authenticated user's ID
  if (targetUser.id !== props.user.id) {
    throw new HttpException("Authorization mismatch", 403);
  }

  // Perform hard deletion of the user account
  const deletedUser = await MyGlobal.prisma.todo_app_users.delete({
    where: { id: targetUser.id },
  });

  // Convert and return the deleted user data
  return {
    id: deletedUser.id,
    email: deletedUser.email,
    name: deletedUser.name,
    status: deletedUser.status,
    last_login_at: deletedUser.last_login_at
      ? toISOStringSafe(deletedUser.last_login_at)
      : undefined,
    created_at: toISOStringSafe(deletedUser.created_at),
    updated_at: toISOStringSafe(deletedUser.updated_at),
  };
}
