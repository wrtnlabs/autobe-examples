import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportOutputMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutputMetric";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingReportOutputMetricCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingReportOutputMetric.ICreate;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      metric_name: props.body.metric_name,
      metric_value: props.body.metric_value,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      reportOutput: {
        connect: { id: props.body.erp_hrm_time_tracking_report_output_id },
      },
    } satisfies Prisma.erp_hrm_time_tracking_report_output_metricsCreateInput;
  }
}
