import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoEditHistoryAtSummaryTransformer {
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
        todo: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_todosFindManyArgs,
      },
    } satisfies Prisma.todo_app_todo_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoEditHistory.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      title: input.title ?? null,
      description: input.description ?? null,
      started_at: input.started_at?.toISOString() ?? null,
      due_at: input.due_at?.toISOString() ?? null,
    } satisfies ITodoAppTodoEditHistory.ISummary;
  }
}
