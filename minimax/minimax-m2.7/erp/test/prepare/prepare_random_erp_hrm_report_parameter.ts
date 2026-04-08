import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_report_parameter(
  input?: DeepPartial<IErpHrmReportParameter.ICreate>,
): IErpHrmReportParameter.ICreate {
  const now = new Date();
  return {
    startDate:
      input?.startDate ??
      RandomGenerator.date(now, 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate:
      input?.endDate ??
      RandomGenerator.date(now, 24 * 60 * 60 * 1000).toISOString(),
    groupBy:
      input?.groupBy ??
      RandomGenerator.pick(["employee", "project", "task"] as const),
    employeeId: input?.employeeId,
    projectId: input?.projectId,
    taskId: input?.taskId,
    billable: input?.billable,
  };
}
