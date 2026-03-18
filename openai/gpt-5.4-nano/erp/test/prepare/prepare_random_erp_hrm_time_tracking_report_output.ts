import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_report_output(
  input?: DeepPartial<IErpHrmTimeTrackingReportOutput.ICreate> | undefined,
): IErpHrmTimeTrackingReportOutput.ICreate {
  return {
    report_generation_run_id:
      input?.report_generation_run_id ??
      typia.random<string & tags.Format<"uuid">>(),
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id: input?.task_id ?? null,
    week_start_date_id: input?.week_start_date_id ?? null,
    grouping_sort_key:
      input?.grouping_sort_key ?? `g_${RandomGenerator.alphabets(24)}`,
    notes: input?.notes ?? null,
  };
}
