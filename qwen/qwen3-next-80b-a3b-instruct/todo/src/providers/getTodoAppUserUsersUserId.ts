import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUser> {
  // Validate that authenticated user is requesting their own data
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Unauthorized: Cannot access other users' profiles",
      403,
    );
  }
  // Query database for user record
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });
  // Return 404 if user not found
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  // Transform database result to API response using already-loaded transformer
  return {
    email: user.email,
    username: user.email, // Use email as username as per transformer logic
    email_verified: user.email_verified,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    id: user.id,
  };
}
