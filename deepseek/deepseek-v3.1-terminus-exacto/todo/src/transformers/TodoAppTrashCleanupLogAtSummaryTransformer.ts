import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTrashCleanupLogAtSummaryTransformer {
  export type Payload = Prisma.todo_app_trash_cleanup_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        operation_type: true,
        operation_status: true,
        items_processed: true,
        items_deleted: true,
        cleanup_criteria: true,
        error_message: true,
        started_at: true,
        completed_at: true,
        created_at: true,
        updated_at: true,
        trashItem: true,
      },
    } satisfies Prisma.todo_app_trash_cleanup_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTrashCleanupLog.ISummary> {
    return {
      id: input.id,
      operation_type: input.operation_type,
      operation_status: input.operation_status,
      items_processed: input.items_processed,
      items_deleted: input.items_deleted,
      started_at: input.started_at.toISOString(),
      completed_at: input.completed_at
        ? input.completed_at.toISOString()
        : null,
    };
  }
}
