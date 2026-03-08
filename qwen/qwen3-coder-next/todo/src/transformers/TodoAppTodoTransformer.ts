import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoTransformer {
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
        is_complete: true,
        is_trashed: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: { id: true },
        },
        editHistoryEntries: true,
        trashEntry: true,
      },
    } satisfies Prisma.todo_app_todosFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppTodo> {
    return {
      id: input.id,
      todo_app_user_id: input.user.id,
      title: input.title,
      description: input.description ?? null,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      is_complete: input.is_complete,
      is_trashed: input.is_trashed,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      restored_at: null,
      permanently_deleted_at: null,
    };
  }
}
