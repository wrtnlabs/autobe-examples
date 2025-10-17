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
export async function postTodoListUserTodoItems(props: {
  user: UserPayload;
  body: ITodoListTodoItem.ICreate;
}): Promise<ITodoListTodoItem> {
  const { user, body } = props;

  if (!body || body.content?.trim() === "") {
    throw new HttpException("Content must not be empty", 400);
  }

  const id = v4() as string & tags.Format<"uuid">;

  try {
    const created = await MyGlobal.prisma.todo_list_todo_items.create({
      data: {
        id,
        user_id: user.id,
        content: body.content,
        completed: false,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    return {
      id: created.id,
      user_id: created.user_id,
      content: created.content,
      completed: created.completed,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    } satisfies ITodoListTodoItem;
  } catch (error) {
    throw new HttpException("Failed to create Todo item", 500);
  }
}
```;
