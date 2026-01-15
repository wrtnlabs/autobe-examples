import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  userId: string;
}): Promise<ITodoUser> {
  const userRecord = await MyGlobal.prisma.todo_users.findUnique({
    where: {
      id: props.userId,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!userRecord) {
    throw new HttpException("User not found", 404);
  }
  return {
    id: userRecord.id,
    email: userRecord.email,
    name: "User", // Default name since database lacks this field
    createdAt: toISOStringSafe(userRecord.created_at),
    updatedAt: toISOStringSafe(userRecord.updated_at),
  };
}
