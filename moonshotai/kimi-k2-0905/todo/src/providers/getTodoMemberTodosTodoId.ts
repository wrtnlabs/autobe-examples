import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { IETodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoPriority";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getTodoMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoTodo> {
  // Query the specific todo item ensuring ownership
  const todo = await MyGlobal.prisma.todo_todos
    .findFirstOrThrow({
      where: {
        id: props.todoId,
        member_id: props.member.id,
      },
    })
    .catch(() => {
      // Convert Prisma not-found to HttpException
      throw new HttpException("Todo not found or access denied", 404);
    });

  // Map Prisma result to API DTO with correct type-safe handling
  // Ensuring no native Date types and proper string format usage
  return {
    id: props.todoId,
    member_id: props.member.id,
    title: todo.title,
    completed: todo.completed,
    priority: todo.priority as IETodoPriority,

    // Handle DateTime fields correctly using toISOStringSafe
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    // Handle nullable DateTime field with proper null handling
    completed_at: todo.completed_at ? toISOStringSafe(todo.completed_at) : null,
  } satisfies ITodoTodo;
}
