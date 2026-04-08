import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoTodoAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_todosGetPayload<
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
        lifecycle_state: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.multi_user_todo_todosFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodo.ISummary> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      start_date: input.start_date ? toISOStringSafe(input.start_date) : null,
      due_date: input.due_date ? toISOStringSafe(input.due_date) : null,
      is_complete: input.is_complete,
      lifecycle_state: input.lifecycle_state,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IMultiUserTodoTodo.ISummary;
  }
}
