import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoHistory";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoTodoAtSummaryTransformer } from "./MultiUserTodoTodoAtSummaryTransformer";

export namespace MultiUserTodoHistoryTransformer {
  export type Payload = Prisma.multi_user_todo_historiesGetPayload<
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
        todo: MultiUserTodoTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoHistory> {
    return {
      id: input.id,
      todo: await MultiUserTodoTodoAtSummaryTransformer.transform(input.todo),
      title: input.title,
      description: input.description ?? null,
      startDate: input.start_date?.toISOString() ?? null,
      dueDate: input.due_date?.toISOString() ?? null,
      isCompleted: input.is_completed,
      createdAt: input.created_at.toISOString(),
    };
  }
}
