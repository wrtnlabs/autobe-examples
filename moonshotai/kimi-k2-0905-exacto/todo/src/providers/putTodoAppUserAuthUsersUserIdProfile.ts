import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserAuthUsersUserIdProfile(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  // Authorization check - users can only update their own profile
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only update your own profile", 403);
  }

  // Check if user exists
  const existingUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
  });

  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }

  // Prepare update data
  const updateData: Prisma.todo_app_usersUpdateInput = {
    updated_at: new Date(),
  };

  // Handle email update if provided
  if (props.body.email !== undefined) {
    const emailLower = props.body.email.toLowerCase();

    // Check if email is already taken by another user
    if (emailLower !== existingUser.email) {
      const emailExists = await MyGlobal.prisma.todo_app_users.findUnique({
        where: { email: emailLower },
      });

      if (emailExists) {
        throw new HttpException("Email already in use by another account", 409);
      }
    }

    updateData.email = emailLower;
  }

  // Handle password update if provided
  if (props.body.password_hash !== undefined) {
    updateData.password_hash = await PasswordUtil.hash(
      props.body.password_hash,
    );
  }

  // Update user
  const updatedUser = await MyGlobal.prisma.todo_app_users.update({
    where: { id: props.userId },
    data: updateData,
  });

  // Return updated user data with proper type safety
  return {
    id: updatedUser.id,
    email: updatedUser.email,
    password_hash: updatedUser.password_hash,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
  };
}
