import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSetting";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoTodoFilterSettingAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_todo_filter_settingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        filter_type: true,
        is_default: true,
        created_at: true,
      },
    } satisfies Prisma.multi_user_todo_todo_filter_settingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodoFilterSetting.ISummary> {
    return {
      id: input.id,
      name: input.name,
      filter_type: input.filter_type,
      is_default: input.is_default,
      created_at: input.created_at.toISOString(),
    };
  }
}
