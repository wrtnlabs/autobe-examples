import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function deleteTodoAppTodoAdminTodoUsersTodoUserId(props: {
  todoAdmin: TodoadminPayload;
  todoUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the target todo user by primary key.
  const existingUser = await MyGlobal.prisma.todo_app_todousers.findUnique({
    where: {
      id: props.todoUserId,
    },
  });

  // Step 2: If not found, respond with 404 Not Found.
  if (existingUser === null) {
    throw new HttpException("Todo user not found", 404);
  }

  // Step 3: Enforce domain rule for restricted/protected statuses.
  // Business requirement: users in certain statuses (e.g., "protected")
  // must not be deletable.
  if (existingUser.status === "protected") {
    throw new HttpException(
      "Todo user in protected status cannot be deleted",
      409,
    );
  }

  // Step 4: Perform hard delete of the todo user record.
  await MyGlobal.prisma.todo_app_todousers.delete({
    where: {
      id: props.todoUserId,
    },
  });

  // Step 5: Explicitly return void (nothing) on success.
  return;
}
