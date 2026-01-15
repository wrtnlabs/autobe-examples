import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoListTodoAtSummaryTransformer {
  export type Payload = Prisma.todo_list_todosGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
      },
    } satisfies Prisma.todo_list_todosFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoListTodo.ISummary> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? undefined,
      is_completed: input.status === "completed",
    };
  }
}
