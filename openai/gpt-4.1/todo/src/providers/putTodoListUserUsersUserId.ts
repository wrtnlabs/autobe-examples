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
  // Step 1: Enforce ownership - user can update only their own account
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only update your own profile.", 403);
  }

  // Step 2: Fetch user
  const existing = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new HttpException("User not found.", 404);
  }

  // Step 3: Uniqueness check if updating email
  let updateData: Record<string, unknown> = {};
  if (props.body.email && props.body.email !== existing.email) {
    const dup = await MyGlobal.prisma.todo_list_users.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
        NOT: { id: props.userId },
      },
    });
    if (dup) {
      throw new HttpException("Email already exists.", 409);
    }
    updateData.email = props.body.email;
  }

  // Always update audit timestamp
  updateData.updated_at = toISOStringSafe(new Date());

  // Step 4: Perform update
  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: updateData,
  });

  // Step 5: Compose response (correct handling of null/undefined)
  return {
    id: updated.id,
    email: updated.email,
    is_verified: updated.is_verified,
    locked: updated.locked,
    locked_at:
      typeof updated.locked_at === "string"
        ? updated.locked_at
        : updated.locked_at
          ? toISOStringSafe(updated.locked_at)
          : undefined,
    email_verification_token: updated.email_verification_token ?? undefined,
    email_verification_sent_at:
      typeof updated.email_verification_sent_at === "string"
        ? updated.email_verification_sent_at
        : updated.email_verification_sent_at
          ? toISOStringSafe(updated.email_verification_sent_at)
          : undefined,
    reset_password_token: updated.reset_password_token ?? undefined,
    reset_password_sent_at:
      typeof updated.reset_password_sent_at === "string"
        ? updated.reset_password_sent_at
        : updated.reset_password_sent_at
          ? toISOStringSafe(updated.reset_password_sent_at)
          : undefined,
    created_at:
      typeof updated.created_at === "string"
        ? updated.created_at
        : toISOStringSafe(updated.created_at),
    updated_at:
      typeof updated.updated_at === "string"
        ? updated.updated_at
        : toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "string"
        ? updated.deleted_at
        : updated.deleted_at
          ? toISOStringSafe(updated.deleted_at)
          : undefined,
  };
}
