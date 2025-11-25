import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoUserTodos(props: {
  user: UserPayload;
  body: ITodoTodo.ICreate;
}): Promise<ITodoTodo> {
  const now = toISOStringSafe(new Date());
  const completion = props.body.status === "complete" ? now : null;

  const created = await MyGlobal.prisma.todo_todos.create({
    data: {
      id: v4(),
      title: props.body.title,
      description:
        props.body.description === undefined ? null : props.body.description,
      status: props.body.status,
      todo_user_id: props.user.id,
      created_at: now,
      updated_at: now,
      completed_at: completion,
    },
    include: {
      user: true,
    },
  });

  return {
    id: created.id,
    title: created.title,
    description: created.description ?? undefined,
    status: typia.assert<"incomplete" | "complete">(created.status),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    completed_at:
      created.completed_at !== null && created.completed_at !== undefined
        ? toISOStringSafe(created.completed_at)
        : undefined,
    user: {
      id: created.user.id,
    },
  };
}
