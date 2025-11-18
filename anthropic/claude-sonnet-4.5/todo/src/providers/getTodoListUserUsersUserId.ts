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

export async function getTodoListUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoListUser> {
  // CRITICAL: Verify userId matches authenticated user's ID
  if (props.userId !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Query the user account from todo_list_users table
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });

  // Return 404 if user not found
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Map Prisma result to ITodoListUser interface
  return {
    id: user.id,
    email: user.email,
    name: user.name === null ? undefined : user.name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? undefined : toISOStringSafe(user.deleted_at),
  };
}
