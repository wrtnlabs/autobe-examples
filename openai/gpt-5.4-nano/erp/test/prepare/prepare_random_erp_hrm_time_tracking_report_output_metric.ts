import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportOutputMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutputMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_report_output_metric(
  input?:
    | DeepPartial<IErpHrmTimeTrackingReportOutputMetric.ICreate>
    | undefined,
): IErpHrmTimeTrackingReportOutputMetric.ICreate {
  return {
    erp_hrm_time_tracking_report_output_id:
      input?.erp_hrm_time_tracking_report_output_id ??
      typia.random<string & tags.Format<"uuid">>(),
    metric_name: input?.metric_name ?? RandomGenerator.name(2),
    metric_value:
      input?.metric_value ?? typia.random<number & tags.Type<"double">>(),
  };
}
