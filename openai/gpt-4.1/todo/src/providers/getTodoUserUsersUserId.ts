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
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only access your own user profile.",
      403,
    );
  }

  const userRecord = await MyGlobal.prisma.todo_users.findUnique({
    where: { id: props.userId },
  });

  if (!userRecord) {
    throw new HttpException("User not found.", 404);
  }

  return {
    id: userRecord.id,
    email: userRecord.email,
    created_at: toISOStringSafe(userRecord.created_at),
    updated_at: toISOStringSafe(userRecord.updated_at),
  };
}
