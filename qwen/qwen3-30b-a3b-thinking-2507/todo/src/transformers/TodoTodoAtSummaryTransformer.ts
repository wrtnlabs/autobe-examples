import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoTodoAtSummaryTransformer {
  export type Payload = Prisma.todo_todosGetPayload<ReturnType<typeof select>>;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        completed: true,
        start_date: true,
        due_date: true,
        created_at: true,
      },
    } satisfies Prisma.todo_todosFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoTodo.ISummary> {
    return {
      id: input.id,
      title: input.title,
      is_complete: input.completed,
      start_date: input.start_date
        ? toISOStringSafe(input.start_date).split("T")[0]
        : undefined,
      due_date: input.due_date
        ? toISOStringSafe(input.due_date).split("T")[0]
        : undefined,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
