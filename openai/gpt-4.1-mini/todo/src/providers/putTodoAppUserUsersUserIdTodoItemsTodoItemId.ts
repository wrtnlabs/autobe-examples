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
import { TodoAppTodoItemTransformer } from "../transformers/TodoAppTodoItemTransformer";

export async function putTodoAppUserUsersUserIdTodoItemsTodoItemId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  todoItemId: string & tags.Format<"uuid">;
  body: ITodoAppTodoItem.IUpdate;
}): Promise<ITodoAppTodoItem> {
  const existing = await MyGlobal.prisma.todo_app_todo_items.findUnique({
    where: { id: props.todoItemId },
    select: {
      todo_app_user_id: true,
    },
  });
  if (!existing) {
    throw new HttpException("Todo item not found", 404);
  }
  if (existing.todo_app_user_id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.todo_app_todo_items.update({
    where: { id: props.todoItemId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(typeof props.body.description === "string" && {
        description: props.body.description,
      }),
      ...(props.body.status !== undefined && {
        status: props.body.status ? "true" : "false",
      }),
      updated_at: toISOStringSafe(new Date()),
    },
    ...TodoAppTodoItemTransformer.select(),
  });
  return await TodoAppTodoItemTransformer.transform(updated);
}
