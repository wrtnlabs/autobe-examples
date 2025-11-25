import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserAuthUserProfile(props: {
  user: UserPayload;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  // Retrieve current user to verify existence and active status
  const currentUser = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.user.id },
  });

  if (!currentUser) {
    throw new HttpException("User not found", 404);
  }

  if (currentUser.deleted_at !== null) {
    throw new HttpException("User account has been deleted", 403);
  }

  // If email is being updated, check for uniqueness
  if (props.body.email !== undefined) {
    const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.user.id },
      },
    });

    if (existingUser) {
      throw new HttpException("Email is already in use", 409);
    }
  }

  // Update the user with inline parameters
  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.user.id },
    data: {
      ...(props.body.email !== undefined && { email: props.body.email }),
      updated_at: new Date(),
    },
  });

  // Return updated user profile with proper type conversions
  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    last_login_at: updated.last_login_at
      ? toISOStringSafe(updated.last_login_at)
      : null,
  };
}
