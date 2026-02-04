import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoTodoTransformer {
  export type Payload = Prisma.todo_todosGetPayload<ReturnType<typeof select>>;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        completed: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: true,
      },
    } satisfies Prisma.todo_todosFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoTodo> {
    return {
      title: input.title,
      id: input.id,
      description: input.description ?? undefined,
      startDate: input.start_date ? toISOStringSafe(input.start_date) : null,
      dueDate: input.due_date ? toISOStringSafe(input.due_date) : null,
      isComplete: input.completed,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
    };
  }
}
