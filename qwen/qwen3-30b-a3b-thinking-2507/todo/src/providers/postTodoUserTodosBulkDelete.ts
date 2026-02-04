import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoUserTodosBulkDelete(props: {
  user: UserPayload;
  body: ITodoTodo.IRequest;
}): Promise<void> {
  const ids = props.body.ids;
  // Validate ID count
  if (ids.length > 50) {
    throw new HttpException("Maximum 50 IDs allowed per request", 400);
  }
  if (ids.length < 1) {
    throw new HttpException("At least one ID is required", 400);
  }
  // Verify all todo IDs exist and belong to the user
  const todos = await MyGlobal.prisma.todo_todos.findMany({
    where: {
      id: { in: ids },
      user: { id: props.user.id },
      deleted_at: null,
    },
  });
  // Check if all IDs were found and belong to the user
  if (todos.length !== ids.length) {
    throw new HttpException(
      "One or more todo IDs do not exist or do not belong to this user",
      400,
    );
  }
  // Delete associated history entries first to maintain data integrity
  await MyGlobal.prisma.todo_histories.deleteMany({
    where: {
      todo: { id: { in: ids } },
    },
  });
  // Delete the todos themselves
  await MyGlobal.prisma.todo_todos.deleteMany({
    where: {
      id: { in: ids },
      user: { id: props.user.id },
    },
  });
}
