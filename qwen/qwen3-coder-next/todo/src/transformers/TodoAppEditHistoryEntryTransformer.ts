import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppEditHistoryEntryTransformer {
  export type Payload = Prisma.todo_app_edit_history_entriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        previous_title: true,
        new_title: true,
        previous_description: true,
        new_description: true,
        previous_start_date: true,
        new_start_date: true,
        previous_due_date: true,
        new_due_date: true,
        edit: {
          select: { id: true },
        },
      },
    } satisfies Prisma.todo_app_edit_history_entriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppEditHistoryEntry> {
    return {
      id: input.id,
      created_at: toISOStringSafe(input.created_at),
      previous_title: input.previous_title ?? undefined,
      new_title: input.new_title ?? undefined,
      previous_description: input.previous_description ?? undefined,
      new_description: input.new_description ?? undefined,
      previous_start_date: input.previous_start_date
        ? toISOStringSafe(input.previous_start_date)
        : null,
      new_start_date: input.new_start_date
        ? toISOStringSafe(input.new_start_date)
        : null,
      previous_due_date: input.previous_due_date
        ? toISOStringSafe(input.previous_due_date)
        : null,
      new_due_date: input.new_due_date
        ? toISOStringSafe(input.new_due_date)
        : null,
      todo_app_todo_edit_id: input.edit.id,
    };
  }
}
