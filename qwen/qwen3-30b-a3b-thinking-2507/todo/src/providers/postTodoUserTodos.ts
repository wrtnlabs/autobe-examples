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
import { TodoTodoTransformer } from "../transformers/TodoTodoTransformer";

export async function postTodoUserTodos(props: {
  user: UserPayload;
  body: ITodoTodo.ICreate;
}): Promise<ITodoTodo> {
  if (props.body.title.length < 1) {
    throw new HttpException("Title must be at least 1 character", 400);
  }
  const data = {
    id: v4(),
    title: props.body.title,
    description: props.body.description ?? null,
    start_date: props.body.start_date ?? null,
    due_date: props.body.due_date ?? null,
    completed: false,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    user: { connect: { id: props.user.id } },
  };
  const created = await MyGlobal.prisma.todo_todos.create({
    data,
    ...TodoTodoTransformer.select(),
  });
  return await TodoTodoTransformer.transform(created);
}
