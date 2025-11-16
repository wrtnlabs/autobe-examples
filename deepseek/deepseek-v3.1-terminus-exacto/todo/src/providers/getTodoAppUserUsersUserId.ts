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
  const userRecord = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
  });

  if (!userRecord) {
    throw new HttpException("User not found", 404);
  }

  if (userRecord.deleted_at !== null) {
    throw new HttpException("User account has been deleted", 404);
  }

  return {
    id: userRecord.id,
    email: userRecord.email,
    password_hash: userRecord.password_hash,
    status: typia.assert<"pending" | "active" | "suspended">(userRecord.status),
    created_at: toISOStringSafe(userRecord.created_at),
    updated_at: toISOStringSafe(userRecord.updated_at),
    deleted_at: userRecord.deleted_at
      ? toISOStringSafe(userRecord.deleted_at)
      : undefined,
  };
}
