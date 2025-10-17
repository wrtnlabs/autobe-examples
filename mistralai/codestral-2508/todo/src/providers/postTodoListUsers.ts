import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postTodoListUsers(props: {
  body: ITodoListUser.ICreate;
}): Promise<ITodoListUser> {
  // Validate password strength
  if (props.body.password.length < 8) {
    throw new HttpException("Password must be at least 8 characters long", 400);
  }

  // Hash the password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Create the user in the database
  const createdUser = await MyGlobal.prisma.todo_list_users
    .create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        email: props.body.email,
        password_hash: hashedPassword,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    })
    .catch((error) => {
      if (error.code === "P2002") {
        throw new HttpException("Email already exists", 409);
      }
      throw error;
    });

  // Return the created user with proper types
  return {
    id: createdUser.id as string & tags.Format<"uuid">,
    email: createdUser.email as string & tags.Format<"email">,
    password_hash: createdUser.password_hash,
    created_at: toISOStringSafe(createdUser.created_at),
    updated_at: toISOStringSafe(createdUser.updated_at),
    deleted_at: createdUser.deleted_at
      ? toISOStringSafe(createdUser.deleted_at)
      : undefined,
  } satisfies ITodoListUser;
}
