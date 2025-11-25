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

export async function putTodoAppUserUsersUserEmail(props: {
  user: UserPayload;
  userEmail: string & tags.Format<"email">;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  // Verify target user exists and is not deleted
  const targetUser = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      email: props.userEmail,
      deleted_at: null,
    },
  });

  if (!targetUser) {
    throw new HttpException("User not found", 404);
  }

  // Verify authenticated user has permission to update this user
  if (targetUser.id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Check if any update fields are provided
  const hasUpdates =
    props.body.name !== undefined ||
    props.body.status !== undefined ||
    props.body.password !== undefined;

  if (!hasUpdates) {
    throw new HttpException("No update fields provided", 400);
  }

  // Validate status if provided
  if (props.body.status !== undefined) {
    const validStatuses = [
      "active",
      "suspended",
      "verified",
      "pending_verification",
      "locked",
    ];
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException("Invalid status value", 400);
    }
  }

  // Prepare update data
  const updateData: Prisma.todo_app_usersUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Handle name update if provided
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }

  // Handle status update if provided
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }

  // Handle password update if provided
  if (props.body.password !== undefined) {
    updateData.password_hash = await PasswordUtil.hash(props.body.password);
  }

  // Perform the update
  const updatedUser = await MyGlobal.prisma.todo_app_users.update({
    where: { id: targetUser.id },
    data: updateData,
  });

  // Return the updated user with proper type conversion
  return {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    status: updatedUser.status,
    last_login_at: updatedUser.last_login_at
      ? toISOStringSafe(updatedUser.last_login_at)
      : undefined,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
  };
}
