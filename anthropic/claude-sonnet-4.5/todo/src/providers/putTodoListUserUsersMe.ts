import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserUsersMe(props: {
  user: UserPayload;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  const { user, body } = props;

  // Verify user exists and is active
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: user.id,
      deleted_at: null,
    },
  });

  if (!existingUser) {
    throw new HttpException("User not found or account is deleted", 404);
  }

  // If email is being updated, check for uniqueness
  if (body.email !== undefined) {
    const emailConflict = await MyGlobal.prisma.todo_list_users.findFirst({
      where: {
        email: body.email,
        id: { not: user.id },
      },
    });

    if (emailConflict) {
      throw new HttpException(
        "Email address already in use by another account",
        409,
      );
    }
  }

  // Prepare update timestamp
  const now = toISOStringSafe(new Date());

  // Update user profile
  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: {
      email: body.email ?? undefined,
      updated_at: now,
    },
  });

  // Return complete user profile with converted timestamps
  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
