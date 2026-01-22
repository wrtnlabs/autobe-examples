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
import { TodoListTodoCollector } from "../collectors/TodoListTodoCollector";
import { TodoListTodoTransformer } from "../transformers/TodoListTodoTransformer";

export async function postTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: await TodoListTodoCollector.collect({
      body: props.body,
      todoListUser: { id: props.user.id },
    }),
    ...TodoListTodoTransformer.select(),
  });
  return await TodoListTodoTransformer.transform(created);
}
