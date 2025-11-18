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
  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });
  if (!existing) {
    throw new HttpException("User not found", 404);
  }

  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: Only the account owner can update their details",
      403,
    );
  }

  let shouldUpdate = false;
  const updateData: Record<string, unknown> = {};

  // Handle email update and uniqueness check
  if (
    typeof props.body.email === "string" &&
    props.body.email !== existing.email
  ) {
    const emailInUse = await MyGlobal.prisma.todo_list_users.findFirst({
      where: { email: props.body.email },
    });
    if (emailInUse && emailInUse.id !== props.userId) {
      throw new HttpException("Email is already in use by another user", 409);
    }
    updateData.email = props.body.email;
    shouldUpdate = true;
  }

  // Handle password update with proper hashing
  if (typeof props.body.password === "string") {
    updateData.password_hash = await PasswordUtil.hash(props.body.password);
    shouldUpdate = true;
  }

  // Handle display_name update (may be set to null or a value, or be omitted)
  if (Object.prototype.hasOwnProperty.call(props.body, "display_name")) {
    // May be string or null as allowed by DTO
    updateData.display_name = props.body.display_name;
    shouldUpdate = true;
  }

  // Always update updated_at timestamp
  updateData.updated_at = toISOStringSafe(new Date());

  // Only update if at least one write field is being changed or always touch updated_at
  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: updateData,
  });

  return {
    id: updated.id,
    email: updated.email,
    display_name:
      typeof updated.display_name === "undefined"
        ? undefined
        : updated.display_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
