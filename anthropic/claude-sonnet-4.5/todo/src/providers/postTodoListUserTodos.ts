import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  // Check duplicate title for same user (exclude soft-deleted entries)
  const duplicate = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      user_id: props.user.id,
      title: props.body.title,
      status: { not: "deleted" },
    },
  });
  if (duplicate) {
    throw new HttpException("Duplicate todo title exists for this user.", 409);
  }

  // Check due_date (if present) is not in the past
  if (props.body.due_date) {
    const nowIso = toISOStringSafe(new Date());
    if (props.body.due_date < nowIso) {
      throw new HttpException("Due date cannot be in the past.", 400);
    }
  }

  const now = toISOStringSafe(new Date());

  let completedAt: string | null | undefined = undefined;
  let deletedAt: string | null | undefined = undefined;
  if (props.body.status === "completed") {
    completedAt = now;
  } else if (props.body.status === "deleted") {
    deletedAt = now;
  }

  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: v4(),
      user_id: props.user.id,
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status,
      due_date: props.body.due_date ?? null,
      completed_at: completedAt ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: deletedAt ?? null,
    },
  });

  const user = await MyGlobal.prisma.todo_list_users.findUniqueOrThrow({
    where: { id: props.user.id },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      disabled_at: true,
    },
  });

  return {
    id: created.id,
    user: {
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      disabled_at:
        user.disabled_at !== null && user.disabled_at !== undefined
          ? toISOStringSafe(user.disabled_at)
          : undefined,
    },
    title: created.title,
    description: created.description ?? undefined,
    status: typia.assert<"pending" | "completed" | "deleted">(created.status),
    due_date:
      created.due_date !== null && created.due_date !== undefined
        ? toISOStringSafe(created.due_date)
        : undefined,
    completed_at:
      created.completed_at !== null && created.completed_at !== undefined
        ? toISOStringSafe(created.completed_at)
        : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
