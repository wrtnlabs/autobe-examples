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

export async function putTodoAppUserAuthUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  // Authorization check - users can only update their own accounts
  if (props.userId !== props.user.id) {
    throw new HttpException("Users can only update their own accounts", 403);
  }

  // Check if user exists
  const existingUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
  });

  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }

  // Build update data based on provided fields
  const updateData: Prisma.todo_app_usersUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Handle email update if provided
  if (props.body.email !== undefined) {
    // Check if email is already taken by another user
    const existingEmail = await MyGlobal.prisma.todo_app_users.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.userId }, // Exclude current user
      },
    });

    if (existingEmail) {
      throw new HttpException("Email address is already in use", 400);
    }

    updateData.email = props.body.email;
  }

  // Handle password update if provided
  if (props.body.password_hash !== undefined) {
    // Hash the password before storing
    const hashedPassword = await PasswordUtil.hash(props.body.password_hash);
    updateData.password_hash = hashedPassword;
  }

  // Update the user
  const updated = await MyGlobal.prisma.todo_app_users.update({
    where: { id: props.userId },
    data: updateData,
  });

  // Return the updated user with proper typing
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
