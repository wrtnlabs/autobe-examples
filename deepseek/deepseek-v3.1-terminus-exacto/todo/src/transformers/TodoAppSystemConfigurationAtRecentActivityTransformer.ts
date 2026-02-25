import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppSystemConfigurationAtRecentActivityTransformer {
  export type Payload = Prisma.todo_app_todo_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        todo: {
          select: {
            id: true,
            title: true,
          },
        } satisfies Prisma.todo_app_todosFindManyArgs,
        user: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_usersFindManyArgs,
        fieldChanges: {
          select: {
            field_name: true,
            // old_value field doesn't exist - removing invalid field
            new_value: true,
          },
        } satisfies Prisma.todo_app_todo_history_changesFindManyArgs,
        snapshotEvents: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_todo_history_snapshot_itemsFindManyArgs,
      },
    } satisfies Prisma.todo_app_todo_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppSystemConfiguration.IRecentActivity> {
    const operationType = determineOperationType(input.fieldChanges);
    return {
      activity_timestamp: toISOStringSafe(input.created_at),
      todo_id: input.todo.id,
      todo_title: input.todo.title,
      operation_type: operationType,
    };
  }
  function determineOperationType(
    fieldChanges: Array<{
      field_name: string;
      new_value: string | null;
    }>,
  ): "edit" | "completion_change" {
    if (!fieldChanges.length) return "edit";
    const hasCompletionChange = fieldChanges.some(
      (change) =>
        change.field_name === "completion_status" ||
        change.field_name === "completed",
    );
    return hasCompletionChange ? "completion_change" : "edit";
  }
}
