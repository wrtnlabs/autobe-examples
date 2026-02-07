import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";

export namespace TodoAppTodoAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todosGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        created_at: true,
        user: TodoAppUserAtSummaryTransformer.select(),
        todo_app_todo_completions: {
          select: {
            id: true,
            is_completed: true,
            created_at: true,
          },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    } satisfies Prisma.todo_app_todosFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodo.ISummary> {
    const latestCompletion = input.todo_app_todo_completions[0];
    const isCompleted = latestCompletion?.is_completed ?? false;
    return {
      id: input.id,
      title: input.title,
      created_at: toISOStringSafe(input.created_at),
      user: await TodoAppUserAtSummaryTransformer.transform(input.user),
      is_completed: isCompleted,
    };
  }
}
