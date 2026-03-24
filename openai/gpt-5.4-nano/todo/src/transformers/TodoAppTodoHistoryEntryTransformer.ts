import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoHistoryEntryTransformer {
  export type Payload = Prisma.todo_app_todo_history_entriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        todo_app_todo_id: true,
        changed_title: true,
        changed_description: true,
        changed_start_date: true,
        changed_due_date: true,
        changed_completion_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        todo: true,
        orderIndexRow: true,
      },
    } satisfies Prisma.todo_app_todo_history_entriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistoryEntry> {
    return {
      id: input.id,
      todo_app_todo_id: input.todo_app_todo_id,
      changed_title: input.changed_title ?? null,
      changed_description: input.changed_description ?? null,
      changed_start_date: input.changed_start_date?.toISOString() ?? null,
      changed_due_date: input.changed_due_date?.toISOString() ?? null,
      changed_completion_status: input.changed_completion_status ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
