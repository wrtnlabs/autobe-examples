import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistoryAttributeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryAttributeChange";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoHistoryAttributeChangeTransformer {
  export type Payload =
    Prisma.todo_app_todo_history_attribute_changesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        attribute_name: true,
        old_value: true,
        new_value: true,
        data_type: true,
        created_at: true,
        updated_at: true,
        todoHistory: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_todo_historiesFindManyArgs,
      },
    } satisfies Prisma.todo_app_todo_history_attribute_changesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistoryAttributeChange> {
    return {
      id: input.id,
      attribute_name: input.attribute_name,
      old_value: input.old_value ?? null,
      new_value: input.new_value ?? null,
      data_type: input.data_type as "string" | "boolean" | "datetime" | "text",
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
