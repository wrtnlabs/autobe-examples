import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoTodoEditHistoryAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_todo_edit_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        old_title: true,
        new_title: true,
        old_description: true,
        new_description: true,
        old_start_date: true,
        new_start_date: true,
        old_due_date: true,
        new_due_date: true,
        todo: {
          select: {
            id: true,
          },
        } satisfies Prisma.multi_user_todo_todosFindManyArgs,
      },
    } satisfies Prisma.multi_user_todo_todo_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodoEditHistory.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      old_title: input.old_title ?? undefined,
      new_title: input.new_title ?? undefined,
      old_description: input.old_description ?? undefined,
      new_description: input.new_description ?? undefined,
      old_start_date: input.old_start_date?.toISOString() ?? null,
      new_start_date: input.new_start_date?.toISOString() ?? null,
      old_due_date: input.old_due_date?.toISOString() ?? null,
      new_due_date: input.new_due_date?.toISOString() ?? null,
    };
  }
}
