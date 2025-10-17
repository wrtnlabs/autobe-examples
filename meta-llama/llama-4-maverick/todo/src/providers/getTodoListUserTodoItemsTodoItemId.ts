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

export async function getTodoListUserTodoItemsTodoItemId(props: {
  user: UserPayload;
  todoItemId: string & tags.Format<"uuid">;
}): Promise<{
  id: string & tags.Format<"uuid">;
  user_id: string & tags.Format<"uuid">;
  content: string;
  completed: boolean;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
}> {
  const { user, todoItemId } = props;
  const retrievedTodoItem =
    await MyGlobal.prisma.todo_list_todo_items.findFirstOrThrow({
      where: {
        id: todoItemId satisfies string as string,
        user_id: user.id satisfies string as string,
      },
    });
  if (!retrievedTodoItem) {
    throw new HttpException("Todo item not found or access denied", 404);
  }
  const result = {
    id: retrievedTodoItem.id satisfies string & tags.Format<"uuid"> as string &
      tags.Format<"uuid">,
    user_id: retrievedTodoItem.user_id satisfies string &
      tags.Format<"uuid"> as string & tags.Format<"uuid">,
    content: retrievedTodoItem.content,
    completed: retrievedTodoItem.completed,
    created_at: toISOStringSafe(retrievedTodoItem.created_at),
    updated_at: toISOStringSafe(retrievedTodoItem.updated_at),
  };
  return result;
}
