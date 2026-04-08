import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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
        title_changed_to: true,
        description_changed_to: true,
        start_date_changed_to: true,
        due_date_changed_to: true,
        todo: TodoAppTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_todo_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoEditHistory> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      title_changed_to: input.title_changed_to ?? null,
      description_changed_to: input.description_changed_to ?? null,
      start_date_changed_to: input.start_date_changed_to?.toISOString() ?? null,
      due_date_changed_to: input.due_date_changed_to?.toISOString() ?? null,
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
    };
  }
}
