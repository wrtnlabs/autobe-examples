import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function getTodoListTodoUserTodoUsersTodoUserId(props: {
  todoUser: TodouserPayload;
  todoUserId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodouser> {
  if (props.todoUser.id !== props.todoUserId) {
    throw new HttpException(
      "Forbidden: You are only allowed to view your own profile.",
      403,
    );
  }
  const user = await MyGlobal.prisma.todo_list_todousers.findUnique({
    where: { id: props.todoUserId },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (user === null) {
    throw new HttpException("Todo user not found.", 404);
  }
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
  };
}
