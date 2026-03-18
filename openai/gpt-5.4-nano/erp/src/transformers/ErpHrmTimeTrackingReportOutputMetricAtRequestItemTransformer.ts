import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportOutputMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutputMetric";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingReportOutputMetricAtRequestItemTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_report_output_metricsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        metric_name: true,
        metric_value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reportOutput: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_report_output_metricsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingReportOutputMetric.IRequestItem> {
    return {
      metric_name: null,
      remove: null,
    };
  }
}
