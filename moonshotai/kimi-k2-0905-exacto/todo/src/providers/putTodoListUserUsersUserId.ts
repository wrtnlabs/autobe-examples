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

export async function putTodoListUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  // Only self-updates allowed
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "You are only permitted to update your own account.",
      403,
    );
  }

  // Find existing user, ensure not locked
  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });
  if (!existing) {
    throw new HttpException("User not found.", 404);
  }
  if (existing.is_locked) {
    throw new HttpException(
      "Your account is locked and cannot be updated.",
      403,
    );
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.email !== undefined && props.body.email !== existing.email) {
    // Enforce global email uniqueness
    const conflict = await MyGlobal.prisma.todo_list_users.findFirst({
      where: { email: props.body.email },
    });
    if (conflict && conflict.id !== props.userId) {
      throw new HttpException(
        "This email is already registered to another account.",
        409,
      );
    }
    updateData.email = props.body.email;
  }
  if (props.body.password !== undefined && props.body.password.length > 0) {
    updateData.hashed_password = await PasswordUtil.hash(props.body.password);
  }

  // Apply update
  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: updateData,
  });

  return {
    id: updated.id,
    email: updated.email,
    is_locked: updated.is_locked,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
