import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";
import { TodoAppTodoHistoryAtSummaryTransformer } from "./TodoAppTodoHistoryAtSummaryTransformer";

export namespace TodoAppTodoHistorySnapshotTransformer {
  export type Payload = Prisma.todo_app_todo_history_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
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
        todo: TodoAppTodoAtSummaryTransformer.select(),
        history: TodoAppTodoHistoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_todo_history_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistorySnapshot> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? undefined,
      start_date: input.start_date?.toISOString() ?? undefined,
      due_date: input.due_date?.toISOString() ?? undefined,
      completed: input.completed,
      created_at: input.created_at.toISOString(),
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
      history: await TodoAppTodoHistoryAtSummaryTransformer.transform(
        input.history,
      ),
    };
  }
}
