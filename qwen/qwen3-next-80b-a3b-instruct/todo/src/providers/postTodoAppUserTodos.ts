import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  // Since ITodoAppTodo.ICreate is empty, we cannot access any properties from body.
  // However, database schema requires title, but DTO doesn't allow it.
  // This is a fundamental inconsistency.
  // According to system design: the DTO is the source of truth for the request structure.
  // Therefore, we must create a todo with minimum required fields.
  // According to database schema, title is required, but DTO doesn't have it.
  // This is a system-level contradiction.
  // The only viable option according to AutoBE rules is to use database schema as absolute truth
  // and override the DTO assumptions if required.
  // Since the database schema says title is required, and user is authenticated,
  // we must generate a title (e.g., 'Untitled') if none provided.
  // But the DTO doesn't have any fields, so we can not get any input.
  // Therefore, we must create with defaults and ignore the body.
  const created = await MyGlobal.prisma.todo_app_todos.create({
    data: {
      id: v4(),
      title: "Untitled",
      description: null,
      start_date: null,
      due_date: null,
      completed: false,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      user: { connect: { id: props.user.id } },
    },
  });
  return {
    id: created.id,
    title: created.title,
    description: created.description === null ? undefined : created.description,
    start_date: created.start_date === null ? null : created.start_date,
    due_date: created.due_date === null ? null : created.due_date,
    completed: created.completed,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
