import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSetting";
import { IMultiUserTodoTodoFilterSettingValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSettingValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoTodoFilterSettingAtSummaryTransformer } from "./MultiUserTodoTodoFilterSettingAtSummaryTransformer";

export namespace MultiUserTodoTodoFilterSettingValueTransformer {
  export type Payload =
    Prisma.multi_user_todo_todo_filter_setting_valuesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        filterSetting:
          MultiUserTodoTodoFilterSettingAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.multi_user_todo_todo_filter_setting_valuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodoFilterSettingValue> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      filterSetting:
        await MultiUserTodoTodoFilterSettingAtSummaryTransformer.transform(
          input.filterSetting,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
