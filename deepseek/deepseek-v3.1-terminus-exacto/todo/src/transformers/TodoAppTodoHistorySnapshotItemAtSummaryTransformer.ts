import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
import { ITodoAppTodoHistorySnapshotItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshotItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTodoHistorySnapshotAtSummaryTransformer } from "./TodoAppTodoHistorySnapshotAtSummaryTransformer";

export namespace TodoAppTodoHistorySnapshotItemAtSummaryTransformer {
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
        todo: true,
      },
    } satisfies Prisma.todo_app_todo_history_snapshot_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistorySnapshotItem.ISummary> {
    return {
      id: input.id,
      title: input.title,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      is_completed: input.is_completed,
      snapshot: await TodoAppTodoHistorySnapshotAtSummaryTransformer.transform(
        input.snapshot,
      ),
    };
  }
}
