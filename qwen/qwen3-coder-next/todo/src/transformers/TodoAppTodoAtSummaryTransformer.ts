import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";

export namespace TodoAppTodoAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todosGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        is_complete: true,
        created_at: true,
        start_date: true,
        due_date: true,
        is_trashed: true,
        user: TodoAppUserAtSummaryTransformer.select(),
        editHistoryEntries: {
          select: { id: true },
        } satisfies Prisma.todo_app_edit_history_entriesFindManyArgs,
        deleted_at: true,
      },
    } satisfies Prisma.todo_app_todosFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodo.ISummary> {
    return {
      id: input.id,
      title: input.title,
      is_complete: input.is_complete,
      created_at: input.created_at.toISOString(),
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      is_trashed: input.is_trashed,
      user: await TodoAppUserAtSummaryTransformer.transform(input.user),
      edit_history_entries_count: input.editHistoryEntries.length,
    };
  }
}
