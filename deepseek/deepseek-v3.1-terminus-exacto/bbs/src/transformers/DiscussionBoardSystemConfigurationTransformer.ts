import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSystemConfigurationTransformer {
  export type Payload = Prisma.discussion_board_system_configurationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        config_key: true,
        config_value: true,
        data_type: true,
        description: true,
        category: true,
        is_sensitive: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        performanceMetrics: {
          select: {
            id: true,
            metric_value: true,
            // Removed recorded_at as it doesn't exist in the schema
          },
        } satisfies Prisma.discussion_board_performance_metricsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_system_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSystemConfiguration> {
    return {
      id: input.id,
      config_key: input.config_key,
      config_value: input.config_value,
      data_type: input.data_type as
        | "string"
        | "integer"
        | "boolean"
        | "number"
        | "json",
      description: input.description,
      category: input.category,
      is_sensitive: input.is_sensitive,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
