import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";
import { TodoAppTodoHistorySnapshotAtSummaryTransformer } from "./TodoAppTodoHistorySnapshotAtSummaryTransformer";

export namespace TodoAppTodoHistorySnapshotAttemTransformer {
  export type Payload = Prisma.todo_app_todo_history_snapshot_itemsGetPayload<
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
        is_completed: true,
        snapshot: TodoAppTodoHistorySnapshotAtSummaryTransformer.select(),
        todo: TodoAppTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_todo_history_snapshot_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistorySnapshot.Item> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      completed_at: input.is_completed
        ? input.snapshot.snapshot_created_at.toISOString()
        : null,
      snapshot_created_at: input.snapshot.snapshot_created_at.toISOString(),
      snapshot: await TodoAppTodoHistorySnapshotAtSummaryTransformer.transform(
        input.snapshot,
      ),
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
    };
  }
}
