import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistoryAttributeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryAttributeChange";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoHistoryAttributeChangeAtSummaryTransformer {
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
      },
    } satisfies Prisma.todo_app_todo_history_attribute_changesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoHistoryAttributeChange.ISummary> {
    return {
      id: input.id,
      attributeName: input.attribute_name,
      oldValue: input.old_value,
      newValue: input.new_value,
      dataType: input.data_type,
      createdAt: input.created_at.toISOString(),
    };
  }
}
