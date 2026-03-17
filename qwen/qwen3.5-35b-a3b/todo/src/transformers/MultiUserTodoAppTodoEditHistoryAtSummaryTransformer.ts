import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoAppTodoEditHistoryAtSummaryTransformer {
  export type Payload =
    Prisma.multi_user_todo_app_todo_edit_historiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        edited_at: true,
        old_title: true,
        new_title: true,
        old_description: true,
        new_description: true,
        old_start_date: true,
        new_start_date: true,
        old_due_date: true,
        new_due_date: true,
        created_at: true,
        updated_at: true,
        todo: true,
        user: true,
      },
    } satisfies Prisma.multi_user_todo_app_todo_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoAppTodoEditHistory.ISummary> {
    return {
      id: input.id,
      editedAt: input.edited_at.toISOString(),
      oldTitle: input.old_title ?? null,
      newTitle: input.new_title ?? null,
      oldDescription: input.old_description ?? null,
      newDescription: input.new_description ?? null,
      oldStartDate: input.old_start_date?.toISOString() ?? null,
      newStartDate: input.new_start_date?.toISOString() ?? null,
      oldDueDate: input.old_due_date?.toISOString() ?? null,
      newDueDate: input.new_due_date?.toISOString() ?? null,
    } satisfies IMultiUserTodoAppTodoEditHistory.ISummary;
  }
}
