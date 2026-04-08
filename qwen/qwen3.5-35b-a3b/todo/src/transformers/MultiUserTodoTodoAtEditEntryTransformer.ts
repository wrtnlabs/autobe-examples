import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoTodoAtEditEntryTransformer {
  export type Payload = Prisma.multi_user_todo_todos_editsGetPayload<
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
        deleted_at: true,
        todo: true,
      },
    } satisfies Prisma.multi_user_todo_todos_editsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodo.IEditEntry> {
    return {
      edited_at: input.edited_at.toISOString(),
      old_title: input.old_title ?? null,
      new_title: input.new_title ?? null,
      old_description: input.old_description ?? null,
      new_description: input.new_description ?? null,
      old_start_date: input.old_start_date?.toISOString() ?? null,
      new_start_date: input.new_start_date?.toISOString() ?? null,
      old_due_date: input.old_due_date?.toISOString() ?? null,
      new_due_date: input.new_due_date?.toISOString() ?? null,
    } satisfies IMultiUserTodoTodo.IEditEntry;
  }
}
