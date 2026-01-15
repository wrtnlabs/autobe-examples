import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoUser.IUpdate;
}): Promise<ITodoUser> {
  // Verify user ID matches authenticated user
  if (props.userId !== props.user.id) {
    throw new HttpException(
      "Forbidden - You can only update your own profile",
      403,
    );
  }
  // Verify user exists
  const existingUser = await MyGlobal.prisma.todo_users.findUnique({
    where: { id: props.userId },
  });
  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }
  // Validate new email if provided
  if (props.body.email && props.body.email !== existingUser.email) {
    const emailExists = await MyGlobal.prisma.todo_users.findFirst({
      where: { email: props.body.email },
    });
    if (emailExists) {
      throw new HttpException("Email already in use", 409);
    }
  }
  // Prepare update data with updated_at timestamp
  const updateData = {
    ...props.body,
    updated_at: toISOStringSafe(new Date()),
  };
  // Perform update
  const updatedUser = await MyGlobal.prisma.todo_users.update({
    where: { id: props.userId },
    data: updateData,
  });
  // Format and return response with all required fields
  return {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name, // Added missing required field
    createdAt: toISOStringSafe(updatedUser.created_at),
    updatedAt: toISOStringSafe(updatedUser.updated_at),
  };
}
