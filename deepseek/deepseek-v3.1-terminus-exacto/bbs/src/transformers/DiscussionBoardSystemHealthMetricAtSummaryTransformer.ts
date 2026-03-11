import { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSystemHealthMetricAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_system_health_metricsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        metric_type: true,
        metric_value: true,
        unit: true,
        source_service: true,
        collection_timestamp: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_system_health_metricsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSystemHealthMetric.ISummary> {
    return {
      id: input.id,
      metric_type: input.metric_type,
      metric_value: input.metric_value,
      unit: input.unit,
      source_service: input.source_service,
      collection_timestamp: input.collection_timestamp.toISOString(),
      status: input.status,
    };
  }
}
