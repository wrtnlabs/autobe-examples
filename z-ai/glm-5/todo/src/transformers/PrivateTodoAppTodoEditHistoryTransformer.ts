import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { IPrivateTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { PrivateTodoAppTodoAtSummaryTransformer } from "./PrivateTodoAppTodoAtSummaryTransformer";

export namespace PrivateTodoAppTodoEditHistoryTransformer {
  export type Payload = Prisma.private_todo_app_todo_edit_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        todo: PrivateTodoAppTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.private_todo_app_todo_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IPrivateTodoAppTodoEditHistory> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      title: input.title,
      description: input.description,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      todo: await PrivateTodoAppTodoAtSummaryTransformer.transform(input.todo),
    };
  }
}
