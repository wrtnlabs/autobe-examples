import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function postTodoAppAuthRegister(props: {
  body: ITodoAppUser.ICreate;
}): Promise<ITodoAppUser> {
  const { body } = props;

  // Check if email already exists
  const existingUser = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (existingUser) {
    throw new HttpException("Email already registered", 400);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(body.password);

  // Generate UUID and current timestamp
  const userId = v4();
  const now = toISOStringSafe(new Date());

  // Create user with satisfies pattern
  const createdUser = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: userId,
      email: body.email,
      password_hash: hashedPassword,
      status: "active",
      created_at: now,
      updated_at: now,
    } satisfies Prisma.todo_app_usersCreateInput,
  });

  // Convert to response format with proper brand types
  return {
    id: createdUser.id as string & tags.Format<"uuid">,
    email: createdUser.email as string & tags.Format<"email">,
    password_hash: createdUser.password_hash,
    status: createdUser.status,
    created_at: toISOStringSafe(createdUser.created_at),
    updated_at: toISOStringSafe(createdUser.updated_at),
    deleted_at: createdUser.deleted_at
      ? toISOStringSafe(createdUser.deleted_at)
      : undefined,
  } satisfies ITodoAppUser;
}
