import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

// Mapping for report_type union
const REPORT_TYPES = [
  "time_report",
  "project_budget_report",
  "weekly_summary_report",
] as const;
// Mapping for group_by union
const GROUP_BY_OPTIONS = ["employee", "project", "task"] as const;
export function prepare_random_erp_hrm_report(
  input?: DeepPartial<IErpHrmReport.ICreate>,
): IErpHrmReport.ICreate {
  return {
    report_type: input?.report_type ?? RandomGenerator.pick(REPORT_TYPES),
    name: input?.name,
    parameter: input?.parameter
      ? prepare_random_parameter(input.parameter)
      : prepare_random_parameter(),
  };
}
function prepare_random_parameter(
  input?: DeepPartial<IErpHrmReportParameter.ICreate>,
): IErpHrmReportParameter.ICreate {
  return {
    billable: input?.billable,
    employee_id: input?.employee_id,
    end_date:
      input?.end_date ?? typia.random<string & tags.Format<"date-time">>(),
    group_by: input?.group_by ?? RandomGenerator.pick(GROUP_BY_OPTIONS),
    project_id: input?.project_id,
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    task_id: input?.task_id,
  };
}
