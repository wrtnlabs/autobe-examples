import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace PrivateTodoAppTodoAtSummaryTransformer {
  export type Payload = Prisma.private_todo_app_todosGetPayload<
    ReturnType<typeof select>
  >;
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
    } satisfies Prisma.private_todo_app_todosFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IPrivateTodoAppTodo.ISummary> {
    return {
      id: input.id,
      title: input.title,
      completed: input.completed,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
