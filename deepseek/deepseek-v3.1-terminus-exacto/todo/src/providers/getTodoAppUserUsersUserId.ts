import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUser> {
  // Authorization check: users can only access their own account
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Unauthorized: You can only access your own user account",
      403,
    );
  }

  // Query the user from database - only non-deleted users
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Construct response object matching ITodoAppUser interface
  // All fields are properly typed based on the interface definition
  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash ?? undefined, // Optional field in API
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
  };
}
