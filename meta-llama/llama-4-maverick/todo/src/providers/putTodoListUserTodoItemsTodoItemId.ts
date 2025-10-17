import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoItem";
import { UserPayload } from "../decorators/payload/UserPayload";

```typescript

export async function putTodoListUserTodoItemsTodoItemId(props: {
  user: UserPayload;
  todoItemId: string & tags.Format<'uuid'>;
  body: ITodoListTodoItem.IUpdate;
}): Promise<ITodoListTodoItem> {
  const { user, todoItemId, body } = props;
  if (!body) throw new HttpException("Invalid request body", 400);
  const existingTodoItem = await MyGlobal.prisma.todo_list_todo_items.findUniqueOrThrow({
    where: { id: todoItemId },
  });
  if (existingTodoItem.user_id !== user.id) {
    throw new HttpException(
      "Todo item not found or you are not authorized to update it",
      404,
    );
  }
  const updateData = {
    ...(body.content !== undefined && { content: body.content ?? undefined }),
    ...(body.completed !== undefined && { completed: body.completed }),
    updated_at: toISOStringSafe(new Date()),
  };
  const updatedTodoItem = await MyGlobal.prisma.todo_list_todo_items.update({
    where: { id: todoItemId },
    data: updateData,
  });
  return {
    id: updatedTodoItem.id satisfies string & tags.Format<'uuid'>,
    user_id: updatedTodoItem.user_id satisfies string & tags.Format<'uuid'>,
    content: updatedTodoItem.content,
    completed: updatedTodoItem.completed,
    created_at: toISOStringSafe(updatedTodoItem.created_at),
    updated_at: toISOStringSafe(updatedTodoItem.updated_at),
  } satisfies ITodoListTodoItem;
}
```;
