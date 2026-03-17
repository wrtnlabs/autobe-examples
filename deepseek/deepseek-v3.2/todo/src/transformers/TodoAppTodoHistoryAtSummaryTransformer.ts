import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppMemberAtSummaryTransformer } from "./TodoAppMemberAtSummaryTransformer";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";

export namespace TodoAppTodoHistoryAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todo_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        todo: TodoAppTodoAtSummaryTransformer.select(),
        member: TodoAppMemberAtSummaryTransformer.select(),
        attributeChanges: {
          select: { id: true },
        } satisfies Prisma.todo_app_todo_history_attribute_changesFindManyArgs,
        snapshot: {
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
      description: input.description,
      created_at: input.created_at.toISOString(),
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
      member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
    };
  }
}
