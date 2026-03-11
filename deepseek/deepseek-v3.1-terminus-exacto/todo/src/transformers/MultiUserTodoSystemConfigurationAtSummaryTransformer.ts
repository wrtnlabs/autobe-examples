import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoSystemConfigurationAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_system_configurationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        config_key: true,
        scope: true,
        data_type: true,
        is_active: true,
        version: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.multi_user_todo_system_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoSystemConfiguration.ISummary> {
    return {
      id: input.id,
      config_key: input.config_key,
      scope: input.scope,
      data_type: input.data_type,
      is_active: input.is_active,
      version: input.version,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
