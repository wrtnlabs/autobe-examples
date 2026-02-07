import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoHistorySnapshotAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todo_history_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_created_at: true,
        created_at: true,
      },
    } satisfies Prisma.todo_app_todo_history_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistorySnapshot.ISummary> {
    return {
      id: input.id,
      snapshot_created_at: input.snapshot_created_at.toISOString(),
      created_at: input.created_at.toISOString(),
    };
  }
}
