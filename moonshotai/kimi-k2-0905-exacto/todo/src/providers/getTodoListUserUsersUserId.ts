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
  // Enforce that user can only access their own account
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: Cannot access another user's account.",
      403,
    );
  }
  const userRecord = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
    select: {
      id: true,
      email: true,
      is_locked: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!userRecord) {
    throw new HttpException("User not found.", 404);
  }
  return {
    id: userRecord.id,
    email: userRecord.email,
    is_locked: userRecord.is_locked,
    created_at: toISOStringSafe(userRecord.created_at),
    updated_at: toISOStringSafe(userRecord.updated_at),
  };
}
