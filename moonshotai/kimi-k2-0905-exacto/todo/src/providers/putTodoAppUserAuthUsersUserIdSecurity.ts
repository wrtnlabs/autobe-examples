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

export async function putTodoAppUserAuthUsersUserIdSecurity(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUser.IUpdate;
}): Promise<void> {
  // Authorization check - users can only update their own security settings
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden - can only update your own security settings",
      403,
    );
  }

  // Check if user exists
  const existingUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
  });

  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }

  // Build update data based on provided fields
  const updateData: {
    email?: string;
    password_hash?: string;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };

  // Handle email update if provided
  if (props.body.email !== undefined) {
    // Check if email is already taken by another user
    const emailExists = await MyGlobal.prisma.todo_app_users.findFirst({
      where: {
        email: props.body.email,
        NOT: { id: props.userId },
      },
    });

    if (emailExists) {
      throw new HttpException("Email already in use by another account", 409);
    }

    updateData.email = props.body.email;
  }

  // Handle password update if provided
  if (props.body.password_hash !== undefined) {
    // Hash the new password
    const hashedPassword = await PasswordUtil.hash(props.body.password_hash);
    updateData.password_hash = hashedPassword;
  }

  // Only update if there are changes beyond the timestamp
  if (Object.keys(updateData).length === 1 && updateData.updated_at) {
    return; // No meaningful changes to make
  }

  // Update user security settings
  await MyGlobal.prisma.todo_app_users.update({
    where: { id: props.userId },
    data: updateData,
  });

  return;
}
