import { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCacheConfigurationParameterAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_monitoring_metricsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        metric_name: true,
        metric_value: true,
        metric_unit: true,
        collection_timestamp: true,
        collection_interval: true,
        metric_category: true,
        is_aggregated: true,
        aggregation_period: true,
        threshold_warning: true,
        threshold_critical: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.ecommerce_platform_monitoring_metricsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCacheConfigurationParameter.ISummary> {
    return {
      id: input.id,
      metric_name: input.metric_name,
      metric_value: input.metric_value,
      metric_unit: input.metric_unit ?? null,
      collection_timestamp: input.collection_timestamp.toISOString(),
      metric_category: input.metric_category,
      is_aggregated: input.is_aggregated,
    };
  }
}
