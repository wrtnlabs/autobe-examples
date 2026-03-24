import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todosGetPayload<
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
        completion_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        deleted_in_trash_at: true,
        member: true,
        historyEntries: true,
        historyEntryOrderIndexes: true,
        snapshots: true,
      },
    } satisfies Prisma.todo_app_todosFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodo.ISummary> {
    return {
      id: input.id,
      title: input.title,
      completion_status: input.completion_status,
      created_at: input.created_at.toISOString(),
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      deleted_in_trash_at: input.deleted_in_trash_at?.toISOString() ?? null,
    };
  }
}
