import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoTodoEditHistoryEntryTransformer {
  export type Payload =
    Prisma.multi_user_todo_todo_edit_history_entriesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        edit_made_at: true,
        previous_title: true,
        new_title: true,
        previous_description: true,
        new_description: true,
        previous_start_date: true,
        new_start_date: true,
        previous_due_date: true,
        new_due_date: true,
        previous_is_complete: true,
        new_is_complete: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        todo: {
          select: { id: true },
        },
        owner: {
          select: { id: true },
        },
      },
    } satisfies Prisma.multi_user_todo_todo_edit_history_entriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodoEditHistoryEntry> {
    return {
      id: input.id,
      todoId: input.todo.id,
      ownerId: input.owner.id,
      editMadeAt: input.edit_made_at.toISOString(),
      previousTitle: input.previous_title,
      newTitle: input.new_title,
      previousDescription: input.previous_description ?? null,
      newDescription: input.new_description ?? null,
      previousStartDate: input.previous_start_date?.toISOString() ?? null,
      newStartDate: input.new_start_date?.toISOString() ?? null,
      previousDueDate: input.previous_due_date?.toISOString() ?? null,
      newDueDate: input.new_due_date?.toISOString() ?? null,
      previousIsComplete: input.previous_is_complete,
      newIsComplete: input.new_is_complete,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMultiUserTodoTodoEditHistoryEntry;
  }
}
