import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoTodoEditHistoryAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_todo_edit_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        changed_title: true,
        changed_description: true,
        changed_start_date: true,
        changed_due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        multi_user_todo_todo_id: true,
      },
    } satisfies Prisma.multi_user_todo_todo_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodoEditHistory.ISummary> {
    return {
      id: input.id,
      changedTitle: input.changed_title ?? undefined,
      changedDescription: input.changed_description ?? undefined,
      changedStartDate: input.changed_start_date
        ? input.changed_start_date.toISOString()
        : null,
      changedDueDate: input.changed_due_date
        ? input.changed_due_date.toISOString()
        : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
      todoId: input.multi_user_todo_todo_id,
    };
  }
}
