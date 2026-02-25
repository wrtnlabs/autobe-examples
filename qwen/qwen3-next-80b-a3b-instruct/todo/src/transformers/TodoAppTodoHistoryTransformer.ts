import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";

export namespace TodoAppTodoHistoryTransformer {
  export type Payload = Prisma.todo_app_todo_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        edited_at: true,
        before_title: true,
        after_title: true,
        before_description: true,
        after_description: true,
        before_startdate: true,
        after_startdate: true,
        before_duedate: true,
        after_duedate: true,
        todo: TodoAppTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_todo_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistory> {
    return {
      id: input.id,
      edited_at: input.edited_at.toISOString(),
      todo_app_todo_id: input.todo.id,
      before_title: input.before_title,
      after_title: input.after_title,
      before_description: input.before_description,
      after_description: input.after_description,
      before_startdate: input.before_startdate?.toISOString() ?? null,
      after_startdate: input.after_startdate?.toISOString() ?? null,
      before_duedate: input.before_duedate?.toISOString() ?? null,
      after_duedate: input.after_duedate?.toISOString() ?? null,
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
    };
  }
}
