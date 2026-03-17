import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoAppTodoAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_app_todosGetPayload<
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
        is_completed: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: true,
        editHistories: true,
      },
    } satisfies Prisma.multi_user_todo_app_todosFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoAppTodo.ISummary> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      is_completed: input.is_completed,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
