import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoUserTodoItems(props: {
  user: UserPayload;
  body: ITodoItem.ICreate;
}): Promise<ITodoItem> {
  const { user, body } = props;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.todo_todo_items.create({
    data: {
      id: v4() satisfies string as string & tags.Format<"uuid">,
      todo_user_id: user.id,
      description: body.description satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      status: body.status,
      due_date: body.due_date ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    description: created.description,
    status: typia.assert<"pending" | "completed">(created.status),
    due_date: created.due_date ? toISOStringSafe(created.due_date) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
