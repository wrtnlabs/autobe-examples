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
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoItemCollector } from "../collectors/TodoAppTodoItemCollector";
import { TodoAppTodoItemTransformer } from "../transformers/TodoAppTodoItemTransformer";

export async function postTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodoItem.ICreate;
}): Promise<ITodoAppTodoItem> {
  const created = await MyGlobal.prisma.todo_app_todo_items.create({
    data: await TodoAppTodoItemCollector.collect({
      body: props.body,
      todoAppUsers: { id: props.user.id },
    }),
    ...TodoAppTodoItemTransformer.select(),
  });
  return await TodoAppTodoItemTransformer.transform(created);
}
