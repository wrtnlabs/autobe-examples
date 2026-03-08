import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEdit";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoEditAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todo_editsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        edited_at: true,
        previous_title: true,
        new_title: true,
        previous_description: true,
        new_description: true,
        previous_start_date: true,
        new_start_date: true,
        previous_due_date: true,
        new_due_date: true,
        created_at: true,
        updated_at: true,
        todo: {
          select: {
            id: true,
          },
        },
        historyEntries: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.todo_app_todo_editsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoEdit.ISummary> {
    return {
      id: input.id,
      edited_at: input.edited_at.toISOString(),
      previous_title: input.previous_title ?? null,
      new_title: input.new_title ?? null,
      previous_description: input.previous_description ?? null,
      new_description: input.new_description ?? null,
      previous_start_date: input.previous_start_date?.toISOString() ?? null,
      new_start_date: input.new_start_date?.toISOString() ?? null,
      previous_due_date: input.previous_due_date?.toISOString() ?? null,
      new_due_date: input.new_due_date?.toISOString() ?? null,
    };
  }
}
