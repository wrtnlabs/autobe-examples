import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoHistoryAtSummaryTransformer {
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistory.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      title: input.title,
      description: input.description,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      completed: input.completed,
    } satisfies ITodoAppTodoHistory.ISummary;
  }
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        completed: true,
        updated_at: true,
        deleted_at: true,
        todo: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_todosFindManyArgs,
      },
    } satisfies Prisma.todo_app_todo_historiesFindManyArgs;
  }
  export type Payload = Prisma.todo_app_todo_historiesGetPayload<
    ReturnType<typeof select>
  >;
}
