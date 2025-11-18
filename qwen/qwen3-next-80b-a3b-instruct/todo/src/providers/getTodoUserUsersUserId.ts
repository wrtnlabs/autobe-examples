import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoUser> {
  // Enforce owner-only access (users can only fetch their own record)
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "You are not authorized to access this resource.",
      403,
    );
  }

  // Fetch the user: include active and soft-deleted
  const user = await MyGlobal.prisma.todo_user.findFirst({
    where: { id: props.userId },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    // deleted_at is nullable in the DB and nullable+optional in DTO
    ...(user.deleted_at !== null && {
      deleted_at: toISOStringSafe(user.deleted_at),
    }),
  };
}
