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

export async function getAuthUserStatus(): Promise<ITodoUser> {
  const user = MyGlobal.auth.user;
  if (!user) {
    throw new HttpException("User not authenticated", 401);
  }
  const userRecord = await MyGlobal.prisma.todo_users.findUnique({
    where: { id: user.id },
  });
  if (!userRecord) {
    throw new HttpException("User not found", 404);
  }
  return {
    id: userRecord.id,
    email: userRecord.email,
    name: userRecord.email.includes("@")
      ? userRecord.email.split("@")[0]
      : userRecord.email || "User",
    createdAt: toISOStringSafe(userRecord.created_at),
    updatedAt: toISOStringSafe(userRecord.updated_at),
  };
}
