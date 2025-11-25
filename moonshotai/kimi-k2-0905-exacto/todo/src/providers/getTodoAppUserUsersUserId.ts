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

export async function getTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUser> {
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Security check: ensure user can only access their own data
  if (user.id !== props.user.id) {
    throw new HttpException(
      "Access denied - you can only view your own account",
      403,
    );
  }

  // Transform to ITodoAppUser format, excluding password_hash for security
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
  };
}
