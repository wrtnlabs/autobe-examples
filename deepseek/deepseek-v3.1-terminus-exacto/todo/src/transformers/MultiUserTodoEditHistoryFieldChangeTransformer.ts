import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistory";
import { IMultiUserTodoEditHistoryFieldChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryFieldChange";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoEditHistoryAtSummaryTransformer } from "./MultiUserTodoEditHistoryAtSummaryTransformer";

export namespace MultiUserTodoEditHistoryFieldChangeTransformer {
  export type Payload =
    Prisma.multi_user_todo_edit_history_field_changesGetPayload<
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
        editHistory: MultiUserTodoEditHistoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_edit_history_field_changesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoEditHistoryFieldChange> {
    return {
      id: input.id,
      field_name: input.field_name,
      previous_value: input.previous_value ?? null,
      new_value: input.new_value,
      created_at: input.created_at.toISOString(),
      editHistory: await MultiUserTodoEditHistoryAtSummaryTransformer.transform(
        input.editHistory,
      ),
    };
  }
}
