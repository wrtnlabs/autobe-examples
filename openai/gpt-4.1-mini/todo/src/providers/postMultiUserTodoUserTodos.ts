import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoTodoCollector } from "../collectors/MultiUserTodoTodoCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { MultiUserTodoTodoTransformer } from "../transformers/MultiUserTodoTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoUserTodos(props: {
  user: UserPayload;
  body: IMultiUserTodoTodo.ICreate;
}): Promise<IMultiUserTodoTodo> {
  if (!props.body.title.trim()) {
    throw new HttpException("Title must not be empty", 400);
  }
  const createData = await MultiUserTodoTodoCollector.collect({
    body: props.body,
    user: props.user,
  });
  const created = await MyGlobal.prisma.multi_user_todo_todos.create({
    data: createData,
    ...MultiUserTodoTodoTransformer.select(),
  });
  return await MultiUserTodoTodoTransformer.transform(created);
}
