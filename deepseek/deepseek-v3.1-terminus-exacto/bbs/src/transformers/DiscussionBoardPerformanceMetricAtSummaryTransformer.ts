import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardPerformanceMetricAtSummaryTransformer {
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
        systemConfiguration: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_system_configurationsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_performance_metricsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardPerformanceMetric.ISummary> {
    return {
      id: input.id,
      metric_type: input.metric_type,
      metric_value: input.metric_value,
      metric_unit: input.metric_unit,
      source_component: input.source_component,
      collection_timestamp: input.collection_timestamp.toISOString(),
    };
  }
}
