import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postTodoAppUserTodos(props: {
  user: UserPayload;
  body: {
    title: string;
    description?: string;
    start_date?: string;
    due_date?: string;
  };
}): Promise<{
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  due_date?: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}> {
  const body = typia.assert<{
    title: string;
    description?: string;
    start_date?: string;
    due_date?: string;
  }>(props.body);
  const now = toISOStringSafe(new Date());
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    const todo = await prisma.todo_app_todos.create({
      data: {
        id: v4(),
        title: body.title,
        todo_app_user_id: props.user.id,
        created_at: now,
        updated_at: now,
      },
    });
    if (body.description) {
      await prisma.todo_app_todo_description_fields.create({
        data: {
          id: v4(),
          todo_app_todo_id: todo.id,
          description: body.description,
          created_at: now,
          updated_at: now,
        },
      });
    }
    if (body.start_date) {
      await prisma.todo_app_todo_start_date_fields.create({
        data: {
          id: v4(),
          todo_app_todo_id: todo.id,
          start_date: body.start_date,
          created_at: now,
          updated_at: now,
        },
      });
    }
    if (body.due_date) {
      await prisma.todo_app_todo_due_date_fields.create({
        data: {
          id: v4(),
          todo_app_todo_id: todo.id,
          due_date: body.due_date,
          // Removed created_at and updated_at as they don't exist in schema
        },
      });
    }
    await prisma.todo_app_todo_completions.create({
      data: {
        id: v4(),
        todo_app_todo_id: todo.id,
        completed: false,
        created_at: now,
      },
    });
    return todo;
  });
  // Return the created todo with default values for optional fields
  return {
    id: result.id,
    title: result.title,
    description: body.description ?? undefined,
    start_date: body.start_date ?? undefined,
    due_date: body.due_date ?? undefined,
    completed: false,
    created_at: result.created_at.toISOString(),
    updated_at: result.updated_at.toISOString(),
  };
}
