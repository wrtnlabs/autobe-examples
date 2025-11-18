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

export async function deleteTodoListUserTodoListUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoListUser> {
  // Validate that authenticated user matches requested userId
  if (props.user.id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }

  // Soft-delete: set deleted_at to current timestamp, do not remove row
  const updatedUser = await MyGlobal.prisma.todo_list_users.update({
    where: {
      id: props.userId,
      deleted_at: null,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  // Return properly formatted ITodoListUser with date-time strings
  return {
    id: updatedUser.id,
    email: updatedUser.email,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: updatedUser.updated_at
      ? toISOStringSafe(updatedUser.updated_at)
      : undefined,
    deleted_at: updatedUser.deleted_at
      ? toISOStringSafe(updatedUser.deleted_at)
      : null,
  };
}
