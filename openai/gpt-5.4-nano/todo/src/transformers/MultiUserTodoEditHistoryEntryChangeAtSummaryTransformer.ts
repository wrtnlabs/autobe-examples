import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoEditHistoryEntryChangeAtSummaryTransformer {
  export type Payload =
    Prisma.multi_user_todo_edit_history_entry_changesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        changed_field: true,
        from_value: true,
        to_value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.multi_user_todo_edit_history_entry_changesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoEditHistoryEntryChange.ISummary> {
    return {
      id: null,
      changedField: null,
      fromValue: null,
      toValue: null,
      createdAt: null,
      updatedAt: null,
      deletedAt: null,
    };
  }
}
