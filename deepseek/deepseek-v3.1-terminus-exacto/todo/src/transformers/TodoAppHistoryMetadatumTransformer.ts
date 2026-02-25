import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppHistoryMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppHistoryMetadatum";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppHistoryMetadatumTransformer {
  export type Payload = Prisma.todo_app_history_metadataGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        config_key: true,
        config_value: true,
        config_description: true,
        is_active: true,
        retention_days: true,
        cleanup_frequency: true,
        max_history_entries: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.todo_app_history_metadataFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppHistoryMetadatum> {
    return {
      id: input.id,
      config_key: input.config_key,
      config_value: input.config_value,
      config_description: input.config_description,
      is_active: input.is_active,
      retention_days: input.retention_days ?? null,
      cleanup_frequency: input.cleanup_frequency ?? null,
      max_history_entries: input.max_history_entries ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
