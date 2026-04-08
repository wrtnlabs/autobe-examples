import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoTodoEditHistoryEntryAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_todosGetPayload<
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
        is_complete: true,
        lifecycle_state: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        editHistoryEntries: {
          select: {
            id: true,
          },
        },
        editHistoryEntriesByOwners: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.multi_user_todo_todosFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodoEditHistoryEntry.ISummary> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      startDate: input.start_date ? toISOStringSafe(input.start_date) : null,
      dueDate: input.due_date ? toISOStringSafe(input.due_date) : null,
      isComplete: input.is_complete,
      lifecycleState: input.lifecycle_state,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IMultiUserTodoTodoEditHistoryEntry.ISummary;
  }
}
