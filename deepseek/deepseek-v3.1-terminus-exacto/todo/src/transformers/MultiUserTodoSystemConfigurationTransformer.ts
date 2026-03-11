import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoSystemConfigurationTransformer {
  export type Payload = Prisma.multi_user_todo_system_configurationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        config_key: true,
        config_value: true,
        data_type: true,
        scope: true,
        description: true,
        is_active: true,
        version: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.multi_user_todo_system_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoSystemConfiguration> {
    return {
      id: input.id,
      config_key: input.config_key,
      config_value: input.config_value,
      data_type: input.data_type,
      scope: input.scope,
      description: input.description,
      is_active: input.is_active,
      version: input.version,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
