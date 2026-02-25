import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardSystemConfigurationAtSummaryTransformer } from "./DiscussionBoardSystemConfigurationAtSummaryTransformer";

export namespace DiscussionBoardPerformanceMetricTransformer {
  export type Payload = Prisma.discussion_board_performance_metricsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        metric_type: true,
        metric_value: true,
        metric_unit: true,
        source_component: true,
        collection_timestamp: true,
        time_range: true,
        metadata: true,
        created_at: true,
        updated_at: true,
        systemConfiguration:
          DiscussionBoardSystemConfigurationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_performance_metricsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardPerformanceMetric> {
    return {
      id: input.id,
      metric_type: input.metric_type,
      metric_value: input.metric_value,
      metric_unit: input.metric_unit,
      source_component: input.source_component,
      collection_timestamp: input.collection_timestamp.toISOString(),
      time_range: input.time_range,
      metadata: input.metadata ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      systemConfiguration: input.systemConfiguration
        ? await DiscussionBoardSystemConfigurationAtSummaryTransformer.transform(
            input.systemConfiguration,
          )
        : null,
    };
  }
}
