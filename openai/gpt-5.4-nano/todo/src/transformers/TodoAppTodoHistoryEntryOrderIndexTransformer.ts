import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistoryEntryOrderIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntryOrderIndex";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoHistoryEntryOrderIndexTransformer {
  export type Payload =
    Prisma.todo_app_todo_history_entry_order_indexesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        position: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        todo_app_todo_id: true,
        todo_app_todo_history_entry_id: true,
      },
    } satisfies Prisma.todo_app_todo_history_entry_order_indexesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistoryEntryOrderIndex> {
    return {
      id: input.id,
      position: input.position,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      todo_app_todo_id: input.todo_app_todo_id,
      todo_app_todo_history_entry_id: input.todo_app_todo_history_entry_id,
    };
  }
}
