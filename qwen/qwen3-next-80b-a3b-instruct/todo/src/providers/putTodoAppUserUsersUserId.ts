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

export async function putTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  // Validate ownership: ensure authenticated user matches target userId
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Unauthorized: Cannot update another user's account",
      403,
    );
  }

  // Find existing user
  const existingUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });

  if (!existingUser) {
    throw new HttpException("User not found or account deleted", 404);
  }

  // Build update data object conditionally, only including fields that are provided
  const updateData: any = {};

  if (props.body.email !== undefined && props.body.email !== null) {
    updateData.email = props.body.email;
  }

  if (
    props.body.password_hash !== undefined &&
    props.body.password_hash !== null
  ) {
    updateData.password_hash = props.body.password_hash;
  }

  if (props.body.deleted_at !== undefined && props.body.deleted_at !== null) {
    updateData.deleted_at = props.body.deleted_at;
  }

  // Always update updated_at with current time as required by the model
  updateData.updated_at = toISOStringSafe(new Date());

  const updatedUser = await MyGlobal.prisma.todo_app_users.update({
    where: {
      id: props.userId,
    },
    data: updateData,
  });

  // Return fully typed user with proper datetime formatting
  return {
    id: updatedUser.id,
    email: updatedUser.email,
    password_hash: updatedUser.password_hash,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
    deleted_at:
      updatedUser.deleted_at !== null
        ? toISOStringSafe(updatedUser.deleted_at)
        : undefined,
  };
}
