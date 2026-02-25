import { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorPlatformMonitoringMetricsPlatformMonitoringMetricId(props: {
  administrator: AdministratorPayload;
  platformMonitoringMetricId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCacheConfigurationParameter> {
  const metric =
    await MyGlobal.prisma.ecommerce_platform_monitoring_metrics.findUniqueOrThrow(
      {
        where: { id: props.platformMonitoringMetricId },
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
        },
      },
    );
  return {
    id: metric.id,
    parameter_name: metric.metric_name,
    parameter_value: metric.metric_value.toString(),
    data_type: "number",
    description: `Platform monitoring metric: ${metric.metric_name} collected at ${metric.collection_timestamp.toISOString()}`,
    created_at: metric.created_at.toISOString(),
  };
}
