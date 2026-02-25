import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { PrincipalAtSummaryTransformer } from "./PrincipalAtSummaryTransformer";

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
        is_deleted: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: PrincipalAtSummaryTransformer.select(),
        historyEntries: {
          select: { id: true, todo_id: true },
        } satisfies Prisma.todo_app_todo_historiesFindManyArgs,
        sortingIndex: {
          select: { id: true },
        } satisfies Prisma.todo_app_todo_sorting_indexesFindManyArgs,
      },
    } satisfies Prisma.todo_app_todosFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppTodo> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? undefined,
      start_date: input.start_date ? input.start_date.toISOString() : undefined,
      due_date: input.due_date ? input.due_date.toISOString() : undefined,
      is_complete: input.is_complete,
      is_deleted: input.is_deleted,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : undefined,
      user: await PrincipalAtSummaryTransformer.transform(input.user),
    };
  }
}
