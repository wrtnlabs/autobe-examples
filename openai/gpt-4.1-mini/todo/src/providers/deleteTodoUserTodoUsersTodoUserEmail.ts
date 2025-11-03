import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserTodoUsersTodoUserEmail(props: {
  user: UserPayload;
  todoUserEmail: string;
}): Promise<void> {
  const { user, todoUserEmail } = props;

  // Find user by email
  const userRecord = await MyGlobal.prisma.todo_users.findFirst({
    where: {
      email: todoUserEmail,
      deleted_at: null,
    },
  });

  if (userRecord === null) {
    throw new HttpException("User not found", 404);
  }

  // Delete the user permanently (cascade deletes related sessions and todos)
  await MyGlobal.prisma.todo_users.delete({
    where: {
      email: todoUserEmail,
    },
  });

  return;
}
