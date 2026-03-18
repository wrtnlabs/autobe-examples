import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoEditHistoryEntryChangeAtSummaryTransformer } from "./MultiUserTodoEditHistoryEntryChangeAtSummaryTransformer";

export namespace MultiUserTodoEditHistoryEntryTransformer {
  export type Payload = Prisma.multi_user_todo_edit_history_entriesGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoEditHistoryEntry> {
    return {
      id: input.id,
      editedAt: input.edited_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      changes: await ArrayUtil.asyncMap(
        input.changes,
        MultiUserTodoEditHistoryEntryChangeAtSummaryTransformer.transform,
      ),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        edited_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        changes:
          MultiUserTodoEditHistoryEntryChangeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_edit_history_entriesFindManyArgs;
  }
}
