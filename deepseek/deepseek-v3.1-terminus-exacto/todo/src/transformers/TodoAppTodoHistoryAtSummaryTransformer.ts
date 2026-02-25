import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";
import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";

export namespace TodoAppTodoHistoryAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todo_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: TodoAppUserAtSummaryTransformer.select(),
        todo: TodoAppTodoAtSummaryTransformer.select(),
        fieldChanges: {
          select: { id: true },
        } satisfies Prisma.todo_app_todo_history_changesFindManyArgs,
        snapshotEvents: {
          select: { id: true },
        } satisfies Prisma.todo_app_todo_history_snapshotsFindManyArgs,
      },
    } satisfies Prisma.todo_app_todo_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistory.ISummary> {
    return {
      id: input.id,
      created_at: toISOStringSafe(input.created_at),
      user: await TodoAppUserAtSummaryTransformer.transform(input.user),
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
    };
  }
}
