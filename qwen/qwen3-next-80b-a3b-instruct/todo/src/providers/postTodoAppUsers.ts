import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function postTodoAppUsers(props: {
  body: ITodoAppUser.ICreate;
}): Promise<ITodoAppUser> {
  const { email, password } = props.body;

  // Hash the password using PasswordUtil
  const password_hash = await PasswordUtil.hash(password);

  // Create user record in database with inline Prisma parameters
  const createdUser = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email,
      password_hash,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the user entity with proper date string formatting
  return {
    id: createdUser.id,
    email: createdUser.email,
    password_hash: createdUser.password_hash,
    created_at: toISOStringSafe(createdUser.created_at),
    updated_at: toISOStringSafe(createdUser.updated_at),
    deleted_at: undefined,
  };
}
