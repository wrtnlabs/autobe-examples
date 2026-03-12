import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoTodoEditHistoryAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_todo_edit_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        edit_timestamp: true,
        field_name: true,
        old_value: true,
        new_value: true,
        created_at: true,
        todo: true,
      },
    } satisfies Prisma.multi_user_todo_todo_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodoEditHistory.ISummary> {
    return {
      id: input.id,
      edit_timestamp: input.edit_timestamp.toISOString(),
      field_name: input.field_name,
      old_value: input.old_value ?? null,
      new_value: input.new_value,
    };
  }
}
