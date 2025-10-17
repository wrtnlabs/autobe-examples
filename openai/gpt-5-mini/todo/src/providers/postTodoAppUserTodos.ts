import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  const { user, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  const isCompleted = body.is_completed ?? false;
  const completedAt = isCompleted ? now : null;

  try {
    const created = await MyGlobal.prisma.todo_app_todos.create({
      data: {
        id,
        user_id: user.id,
        title: body.title,
        description: body.description ?? null,
        is_completed: isCompleted,
        completed_at: completedAt,
        position: body.position ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: {
        id: true,
        user_id: true,
        title: true,
        description: true,
        is_completed: true,
        completed_at: true,
        position: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
      user_id: created.user_id as string & tags.Format<"uuid">,
      title: created.title,
      description: created.description ?? undefined,
      is_completed: created.is_completed,
      completed_at: completedAt,
      position: created.position ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
  } catch (error) {
    throw new HttpException("Failed to create todo", 500);
  }
}
