import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppEditHistoryTransformer {
  export type Payload = Prisma.todo_app_edit_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        previous_title: true,
        new_title: true,
        previous_description: true,
        new_description: true,
        previous_start_date: true,
        new_start_date: true,
        previous_due_date: true,
        new_due_date: true,
        todo: {
          select: {
            id: true,
          },
        },
        member: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.todo_app_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppEditHistory> {
    return {
      id: input.id,
      todoAppTodosId: input.todo.id,
      todoAppMemberId: input.member.id,
      createdAt: input.created_at.toISOString(),
      previousTitle: input.previous_title ?? null,
      newTitle: input.new_title ?? null,
      previousDescription: input.previous_description ?? null,
      newDescription: input.new_description ?? null,
      previousStartDate: input.previous_start_date?.toISOString() ?? null,
      newStartDate: input.new_start_date?.toISOString() ?? null,
      previousDueDate: input.previous_due_date?.toISOString() ?? null,
      newDueDate: input.new_due_date?.toISOString() ?? null,
    } satisfies ITodoAppEditHistory;
  }
}
