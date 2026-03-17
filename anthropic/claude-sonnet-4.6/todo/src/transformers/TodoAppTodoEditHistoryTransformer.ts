import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoEditHistoryTransformer {
  export type Payload = Prisma.todo_app_todo_edit_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        todo: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_todosDefaultArgs,
        title: true,
        description: true,
        started_at: true,
        due_at: true,
        created_at: true,
      },
    } satisfies Prisma.todo_app_todo_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoEditHistory> {
    return {
      id: input.id,
      todo_app_todo_id: input.todo.id,
      title: input.title,
      description: input.description,
      started_at: input.started_at?.toISOString() ?? null,
      due_at: input.due_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
