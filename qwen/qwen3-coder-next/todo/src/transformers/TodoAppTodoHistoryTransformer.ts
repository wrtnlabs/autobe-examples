import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoHistoryTransformer {
  export type Payload = Prisma.todo_app_todo_historiesGetPayload<
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
        todo_id: true,
      },
    } satisfies Prisma.todo_app_todo_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistory> {
    return {
      id: input.id,
      todoId: input.todo_id,
      editedAt: toISOStringSafe(input.edited_at),
      previousTitle: input.previous_title ?? null,
      previousDescription: input.previous_description ?? null,
      previousStartDate: input.previous_start_date
        ? toISOStringSafe(input.previous_start_date)
        : null,
      previousDueDate: input.previous_due_date
        ? toISOStringSafe(input.previous_due_date)
        : null,
      newTitle: input.new_title ?? null,
      newDescription: input.new_description ?? null,
      newStartDate: input.new_start_date
        ? toISOStringSafe(input.new_start_date)
        : null,
      newDueDate: input.new_due_date
        ? toISOStringSafe(input.new_due_date)
        : null,
    };
  }
}
