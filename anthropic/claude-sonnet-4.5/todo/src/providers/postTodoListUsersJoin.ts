import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postTodoListUsersJoin(props: {
  body: ITodoListUser.ICreate;
}): Promise<ITodoListUser> {
  const { body } = props;

  // Check email uniqueness
  const existing = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: body.email },
  });

  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password securely
  const passwordHash = await PasswordUtil.hash(body.password);

  // Generate required IDs (no @default in schema)
  const userId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;

  // Prepare timestamps once for consistency
  const now = toISOStringSafe(new Date());

  // Determine IP address with explicit null and undefined handling
  const ipAddress =
    body.ip !== undefined && body.ip !== null ? body.ip : "0.0.0.0";

  // Create user record
  await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: userId,
      email: body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });

  // Create initial session record
  await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: sessionId,
      todo_list_user_id: userId,
      ip: ipAddress,
      href: body.href,
      referrer: body.referrer,
      created_at: now,
      expired_at: undefined,
    },
  });

  // Return user data matching ITodoListUser interface
  return {
    id: userId,
    email: body.email,
    created_at: now,
    updated_at: now,
    deleted_at: undefined,
  };
}
