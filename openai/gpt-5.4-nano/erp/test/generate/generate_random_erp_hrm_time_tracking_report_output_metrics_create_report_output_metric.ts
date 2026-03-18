import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingReportOutputMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutputMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_tracking_report_output_metric } from "../prepare/prepare_random_erp_hrm_time_tracking_report_output_metric";

export async function generate_random_erp_hrm_time_tracking_report_output_metrics_create_report_output_metric(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IErpHrmTimeTrackingReportOutputMetric.ICreate>
      | undefined;
  },
): Promise<IErpHrmTimeTrackingReportOutputMetric> {
  const prepared: IErpHrmTimeTrackingReportOutputMetric.ICreate =
    prepare_random_erp_hrm_time_tracking_report_output_metric(props.body);
  return await api.functional.erpHrmTimeTracking.reportOutputMetrics.createReportOutputMetric(
    connection,
    {
      body: prepared,
    },
  );
}
