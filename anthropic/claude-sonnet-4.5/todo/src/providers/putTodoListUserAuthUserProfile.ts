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

export async function putTodoListUserAuthUserProfile(props: {
  user: UserPayload;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser.IProfile> {
  const { user, body } = props;

  // Verify user exists and is not deleted
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: user.id,
      deleted_at: null,
    },
  });

  if (!existingUser) {
    throw new HttpException("User not found or has been deleted", 404);
  }

  // If email update requested, verify uniqueness
  if (body.email !== undefined) {
    const emailConflict = await MyGlobal.prisma.todo_list_users.findFirst({
      where: {
        email: body.email,
        id: { not: user.id },
        deleted_at: null,
      },
    });

    if (emailConflict) {
      throw new HttpException(
        "Email address is already in use by another account",
        409,
      );
    }
  }

  // Update user profile with validated data
  const updateData = {
    email: body.email ?? undefined,
    updated_at: toISOStringSafe(new Date()),
  } satisfies Prisma.todo_list_usersUpdateInput;

  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: updateData,
  });

  // Return profile with all date fields converted to ISO strings
  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
