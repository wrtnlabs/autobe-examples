import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
        is_completed: true,
        start_date: true,
        due_date: true,
        created_at: true,
      },
    } satisfies Prisma.multi_user_todo_todosFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodo.ISummary> {
    return {
      id: input.id,
      title: input.title,
      is_completed: input.is_completed,
      start_date: input.start_date ? input.start_date.toISOString() : null,
      due_date: input.due_date ? input.due_date.toISOString() : null,
      created_at: input.created_at.toISOString(),
    };
  }
}
