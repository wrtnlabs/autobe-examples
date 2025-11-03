import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodoCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodoCompletion";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserTodosTodoIdCompletion(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoTodoCompletion.IUpdate;
}): Promise<ITodoTodo> {
  const { user, todoId, body } = props;

  // Fetch target todo with owner relation
  const existing = await MyGlobal.prisma.todo_todos.findUnique({
    where: { id: todoId },
    include: { user: true },
  });
  if (!existing) throw new HttpException("Not Found", 404);

  // Authorization: only owner can update
  if (existing.todo_user_id !== user.id) {
    throw new HttpException(
      "Forbidden: You can only update your own todos",
      403,
    );
  }

  // Idempotent: if requested state equals current, return current representation
  if (existing.completed === body.completed) {
    const dueDate = existing.due_date
      ? (toISOStringSafe(existing.due_date).slice(0, 10) as string &
          tags.Format<"date">)
      : null;

    return {
      id: existing.id as string & tags.Format<"uuid">,
      title: existing.title,
      description: existing.description ?? null,
      due_date: dueDate,
      completed: existing.completed,
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
      user: {
        id: existing.user.id as string & tags.Format<"uuid">,
        email: existing.user.email as string & tags.Format<"email">,
        created_at: toISOStringSafe(existing.user.created_at),
        updated_at: toISOStringSafe(existing.user.updated_at),
      },
    };
  }

  // Update state and write audit log in parallel
  const now = toISOStringSafe(new Date());
  const [updated] = await Promise.all([
    MyGlobal.prisma.todo_todos.update({
      where: { id: todoId },
      data: {
        completed: body.completed,
        updated_at: now,
      },
      include: { user: true },
    }),
    MyGlobal.prisma.todo_audit_events.create({
      data: {
        id: v4(),
        todo_user_id: user.id,
        todo_user_session_id: user.session_id,
        todo_todo_id: todoId,
        actor_type: "user",
        category: "todo",
        action: "todo_update",
        success: true,
        message: body.completed ? "Marked todo as completed" : "Reopened todo",
        ip: null,
        href: null,
        referrer: null,
        resource_type: "todo",
        resource_id: todoId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
  ]);

  const dueDate = updated.due_date
    ? (toISOStringSafe(updated.due_date).slice(0, 10) as string &
        tags.Format<"date">)
    : null;

  return {
    id: updated.id as string & tags.Format<"uuid">,
    title: updated.title,
    description: updated.description ?? null,
    due_date: dueDate,
    completed: updated.completed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    user: {
      id: updated.user.id as string & tags.Format<"uuid">,
      email: updated.user.email as string & tags.Format<"email">,
      created_at: toISOStringSafe(updated.user.created_at),
      updated_at: toISOStringSafe(updated.user.updated_at),
    },
  };
}
