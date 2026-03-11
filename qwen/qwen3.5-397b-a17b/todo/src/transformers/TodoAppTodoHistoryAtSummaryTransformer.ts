import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoHistoryAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todo_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        new_title: true,
        new_description: true,
        new_start_date: true,
        new_due_date: true,
        created_at: true,
        todo: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_todosFindManyArgs,
      },
    } satisfies Prisma.todo_app_todo_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistory.ISummary> {
    return {
      id: input.id,
      new_title: input.new_title ?? undefined,
      new_description: input.new_description ?? undefined,
      new_start_date: input.new_start_date?.toISOString() ?? undefined,
      new_due_date: input.new_due_date?.toISOString() ?? undefined,
      created_at: input.created_at.toISOString(),
    };
  }
}
