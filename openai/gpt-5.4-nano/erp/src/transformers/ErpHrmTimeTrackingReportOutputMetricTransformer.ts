import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportOutputMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutputMetric";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingReportOutputMetricTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_report_output_metricsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        erp_hrm_time_tracking_report_output_id: true,
        metric_name: true,
        metric_value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_report_output_metricsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingReportOutputMetric> {
    return {
      id: input.id,
      erp_hrm_time_tracking_report_output_id:
        input.erp_hrm_time_tracking_report_output_id,
      metric_name: input.metric_name,
      metric_value: input.metric_value,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
