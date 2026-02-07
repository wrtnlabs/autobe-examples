import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistoryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryChange";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoHistoryChangeTransformer {
  export type Payload = Prisma.todo_app_todo_history_changesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        field_name: true,
        previous_value: true,
        new_value: true,
        created_at: true,
        history: true, // Include required relation even though DTO doesn't have corresponding property
      },
    } satisfies Prisma.todo_app_todo_history_changesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistoryChange> {
    return {
      id: input.id,
      field_name: input.field_name,
      previous_value: input.previous_value ?? null,
      new_value: input.new_value ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
