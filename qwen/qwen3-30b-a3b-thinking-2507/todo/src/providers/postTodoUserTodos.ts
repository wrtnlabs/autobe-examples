import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoTodoCollector } from "../collectors/TodoTodoCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoTodoTransformer } from "../transformers/TodoTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoUserTodos(props: {
  user: UserPayload;
  body: ITodoTodo.ICreate;
}): Promise<ITodoTodo> {
  const selectConfig = TodoTodoTransformer.select();
  const created = await MyGlobal.prisma.todo_todos.create({
    data: await TodoTodoCollector.collect({
      body: props.body,
      todoUsers: { id: props.user.id },
    }),
    select: selectConfig.select,
  });
  return await TodoTodoTransformer.transform(created);
}
