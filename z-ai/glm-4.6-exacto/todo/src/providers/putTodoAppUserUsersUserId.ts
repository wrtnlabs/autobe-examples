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

export async function putTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  // Restrict updates to self only
  if (props.userId !== props.user.id) {
    throw new HttpException(
      "You are only permitted to update your own user account.",
      403,
    );
  }

  // Fetch current user record
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
  });
  if (!user || user.deleted_at !== null) {
    throw new HttpException("User not found.", 404);
  }

  const updatePayload: Record<string, unknown> = {};

  // If email present, check for conflict
  if (props.body.email !== undefined && props.body.email !== user.email) {
    const existing = await MyGlobal.prisma.todo_app_users.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
        NOT: { id: props.userId },
      },
    });
    if (existing) {
      throw new HttpException(
        "This email address is already registered to another account.",
        409,
      );
    }
    updatePayload.email = props.body.email;
  }

  // If password present, hash for storage
  if (props.body.password !== undefined) {
    updatePayload.password_hash = await PasswordUtil.hash(props.body.password);
  }

  // Always update updated_at
  updatePayload.updated_at = toISOStringSafe(new Date());

  // If nothing to update, return as is
  if (Object.keys(updatePayload).length === 0) {
    return {
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at:
        user.deleted_at === null ? undefined : toISOStringSafe(user.deleted_at),
    };
  }

  // Update the record
  const updated = await MyGlobal.prisma.todo_app_users.update({
    where: { id: props.userId },
    data: updatePayload,
  });

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
