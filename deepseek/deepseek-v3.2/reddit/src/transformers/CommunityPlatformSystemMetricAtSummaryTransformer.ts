import { ICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformSystemMetricAtSummaryTransformer {
  export type Payload = Prisma.community_platform_system_metricsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        component: true,
        metric_name: true,
        aggregation_period: true,
        period_start: true,
        period_end: true,
        metric_value: true,
        value_type: true,
        dimensions: true,
        notes: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.community_platform_system_metricsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformSystemMetric.ISummary> {
    return {
      id: input.id,
      component: input.component,
      metric_name: input.metric_name,
      aggregation_period: input.aggregation_period,
      period_start: input.period_start.toISOString(),
      period_end: input.period_end.toISOString(),
      metric_value: input.metric_value,
      value_type: input.value_type,
      dimensions: input.dimensions ?? undefined,
      notes: input.notes ?? undefined,
      created_at: input.created_at.toISOString(),
    };
  }
}
