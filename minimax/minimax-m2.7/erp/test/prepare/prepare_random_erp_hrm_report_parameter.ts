import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_report_parameter(
  input?: DeepPartial<IErpHrmReportParameter.ICreate>,
): IErpHrmReportParameter.ICreate {
  const startDate = RandomGenerator.date(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    15 * 24 * 60 * 60 * 1000,
  );
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    billable:
      input?.billable ?? RandomGenerator.pick([true, false, null] as const),
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    end_date:
      input?.end_date ??
      (endDate.toISOString() as string & tags.Format<"date-time">),
    group_by:
      input?.group_by ??
      RandomGenerator.pick(["employee", "project", "task"] as const),
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    start_date:
      input?.start_date ??
      (startDate.toISOString() as string & tags.Format<"date-time">),
    task_id: input?.task_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
