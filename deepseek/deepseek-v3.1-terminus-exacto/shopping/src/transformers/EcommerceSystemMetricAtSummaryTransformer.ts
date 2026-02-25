import { IEcommerceSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceSystemMetricAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_system_metricsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        metric_name: true,
        metric_category: true,
        metric_value: true,
        metric_unit: true,
        measurement_timestamp: true,
        collection_interval: true,
        source_component: true,
        environment: true,
        threshold_exceeded: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.ecommerce_system_metricsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceSystemMetric.ISummary> {
    return {
      id: input.id,
      metric_name: input.metric_name,
      metric_category: input.metric_category,
      metric_value: input.metric_value,
      metric_unit: input.metric_unit,
      source_component: input.source_component,
      environment: input.environment,
      threshold_exceeded: input.threshold_exceeded,
    };
  }
}
