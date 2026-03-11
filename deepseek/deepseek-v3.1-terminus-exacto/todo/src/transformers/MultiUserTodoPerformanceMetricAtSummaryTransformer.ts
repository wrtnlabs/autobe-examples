import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoPerformanceMetric";
import { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoSystemConfigurationAtSummaryTransformer } from "./MultiUserTodoSystemConfigurationAtSummaryTransformer";

export namespace MultiUserTodoPerformanceMetricAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_performance_metricsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        metric_type: true,
        metric_value: true,
        metric_unit: true,
        service_name: true,
        endpoint_path: true,
        collection_timestamp: true,
        created_at: true,
        updated_at: true,
        systemConfiguration:
          MultiUserTodoSystemConfigurationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_performance_metricsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoPerformanceMetric.ISummary> {
    return {
      id: input.id,
      metric_type: input.metric_type,
      metric_value: input.metric_value,
      metric_unit: input.metric_unit,
      service_name: input.service_name,
      collection_timestamp: input.collection_timestamp.toISOString(),
      systemConfiguration: input.systemConfiguration
        ? await MultiUserTodoSystemConfigurationAtSummaryTransformer.transform(
            input.systemConfiguration,
          )
        : null,
    };
  }
}
