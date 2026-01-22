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
import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoListTodoTransformer } from "../transformers/TodoListTodoTransformer";
import { TodoListUserTransformer } from "../transformers/TodoListUserTransformer";

export async function getTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: {
      id: props.todoId,
      todo_list_user_id: props.user.id,
    },
    ...TodoListTodoTransformer.select(),
  });
  if (!todo) {
    throw new HttpException("Todo item not found", 404);
  }
  // Transform the todo with the user object mapped correctly
  const transformedTodo = await TodoListTodoTransformer.transform(todo);
  // Get user data from database using the transformer
  const user = await MyGlobal.prisma.todo_list_user.findUnique({
    where: { id: props.user.id },
    ...TodoListUserTransformer.select(),
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  // Transform user to the correct ITodoListUser.ISummary format
  const transformedUser = await TodoListUserTransformer.transform(user);
  // Replace the user object with the properly transformed one
  return {
    ...transformedTodo,
    user: transformedUser,
  };
}
