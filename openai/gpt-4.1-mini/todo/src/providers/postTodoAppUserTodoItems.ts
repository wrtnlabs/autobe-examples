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
import { ITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItemAuditLog";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoItemCollector } from "../collectors/TodoAppTodoItemCollector";
import { TodoAppTodoItemTransformer } from "../transformers/TodoAppTodoItemTransformer";

export async function postTodoAppUserTodoItems(props: {
  user: UserPayload;
  body: ITodoAppTodoItem.ICreate;
}): Promise<ITodoAppTodoItem> {
  // Use the collector to prepare data for insertion
  const data = await TodoAppTodoItemCollector.collect({
    body: props.body,
    todoAppUser: { id: props.user.id },
    todoAppUserSession: { id: props.user.session_id },
  });
  // Create the todo item record in the database with selected fields for transformer
  const createdTodoItem = await MyGlobal.prisma.todo_app_todo_items.create({
    data,
    ...TodoAppTodoItemTransformer.select(),
  });
  // Transform the created record into the response DTO
  return await TodoAppTodoItemTransformer.transform(createdTodoItem);
}
