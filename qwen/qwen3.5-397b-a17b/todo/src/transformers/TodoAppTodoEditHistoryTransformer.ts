import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";

export namespace TodoAppTodoEditHistoryTransformer {
  export type Payload = Prisma.todo_app_todo_edit_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        title: true,
        description: true,
        started_at: true,
        due_at: true,
        todo: TodoAppTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_todo_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoEditHistory> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      title: input.title ?? null,
      description: input.description ?? null,
      startedAt: input.started_at?.toISOString() ?? null,
      dueAt: input.due_at?.toISOString() ?? null,
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
    } satisfies ITodoAppTodoEditHistory;
  }
}
