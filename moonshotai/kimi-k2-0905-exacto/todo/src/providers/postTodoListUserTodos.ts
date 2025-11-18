import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  const now = toISOStringSafe(new Date());
  let completedAt: string | null = null;
  if (props.body.completed) {
    completedAt = now;
  }
  try {
    const record = await MyGlobal.prisma.todo_list_todos.create({
      data: {
        id: v4(),
        user_id: props.user.id,
        description: props.body.description,
        completed: props.body.completed,
        completed_at: completedAt,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return {
      id: record.id,
      description: record.description,
      completed: record.completed,
      completed_at: record.completed_at
        ? toISOStringSafe(record.completed_at)
        : null,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Duplicate todo description for this user within allowed interval.",
        409,
      );
    }
    throw err;
  }
}
