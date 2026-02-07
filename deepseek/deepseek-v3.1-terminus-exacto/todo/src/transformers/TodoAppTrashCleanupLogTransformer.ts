import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupLog";
import { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTrashItemAtSummaryTransformer } from "./TodoAppTrashItemAtSummaryTransformer";

export namespace TodoAppTrashCleanupLogTransformer {
  export type Payload = Prisma.todo_app_trash_cleanup_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        operation_type: true,
        items_processed: true,
        items_deleted: true,
        cleanup_criteria: true,
        operation_status: true,
        error_message: true,
        started_at: true,
        completed_at: true,
        created_at: true,
        updated_at: true,
        trashItem: TodoAppTrashItemAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_trash_cleanup_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTrashCleanupLog> {
    return {
      id: input.id,
      operation_type: input.operation_type,
      items_processed: input.items_processed,
      items_deleted: input.items_deleted,
      cleanup_criteria: input.cleanup_criteria,
      operation_status: input.operation_status,
      error_message: input.error_message ?? undefined,
      started_at: input.started_at.toISOString(),
      completed_at: input.completed_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      trashItem: await TodoAppTrashItemAtSummaryTransformer.transform(
        input.trashItem,
      ),
    };
  }
}
