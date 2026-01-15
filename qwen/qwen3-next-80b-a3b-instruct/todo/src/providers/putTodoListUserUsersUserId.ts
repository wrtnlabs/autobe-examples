import { ArrayUtil } from "@nestia/e2e";
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

export async function putTodoListUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  // Verify user has permission: user.id must match userId
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only update your own profile",
      403,
    );
  }
  // Prepare update data with conditional spread using only fields that exist in schema
  const updateData = {
    ...(props.body.email && { email: props.body.email }),
  };
  // Update user in database
  const updated = await MyGlobal.prisma.todo_list_user.update({
    where: { id: props.userId },
    data: updateData,
  });
  // Return complete user object with only fields that exist in schema
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at,
  };
}
