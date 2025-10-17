import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postTodoListAuthRegister(props: {
  body: ITodoListUser.ICreate;
}): Promise<ITodoListUser> {
  const { body } = props;

  // Normalize email to lowercase for case-insensitive comparison
  const normalizedEmail = body.email.toLowerCase();

  // Check if email already exists (unique constraint)
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    throw new HttpException("Email address is already registered", 409);
  }

  // Hash the password securely using bcrypt
  const passwordHash = await PasswordUtil.hash(body.password);

  // Generate UUID and timestamps
  const userId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create the user account
  const created = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: userId,
      email: normalizedEmail,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return user object excluding password_hash and deleted_at for security
  return {
    id: userId,
    email: created.email,
    created_at: now,
    updated_at: now,
  };
}
