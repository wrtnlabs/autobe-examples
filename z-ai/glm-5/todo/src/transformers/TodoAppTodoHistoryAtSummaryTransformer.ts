import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";

export namespace TodoAppTodoHistoryAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todo_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        edited_at: true,
        title_change: true,
        description_change: true,
        start_date_change: true,
        due_date_change: true,
        todo: TodoAppTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_todo_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistory.ISummary> {
    return {
      id: input.id,
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
      edited_at: input.edited_at.toISOString(),
      title_change: input.title_change,
      description_change: input.description_change,
      start_date_change: input.start_date_change?.toISOString() ?? null,
      due_date_change: input.due_date_change?.toISOString() ?? null,
    };
  }
}
