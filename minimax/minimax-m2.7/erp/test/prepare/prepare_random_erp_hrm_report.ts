import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_report(
  input?: DeepPartial<IErpHrmReport.ICreate>,
): IErpHrmReport.ICreate {
  // Generate start date first
  const startDate =
    input?.startDate ?? typia.random<string & tags.Format<"date">>();
  // Generate end date (ensure it's after startDate by generating a date in the future)
  const endDate =
    input?.endDate ??
    (() => {
      const start = new Date(startDate);
      start.setDate(start.getDate() + 30); // Add 30 days to ensure endDate > startDate
      return start.toISOString().split("T")[0]!;
    })();
  return {
    reportType:
      input?.reportType ??
      RandomGenerator.pick([
        "time_report",
        "project_budget_report",
        "weekly_summary_report",
      ] as const),
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 2 }),
    startDate,
    endDate,
    groupBy: input?.groupBy,
    billable: input?.billable,
    employeeId: input?.employeeId,
    projectId: input?.projectId,
    taskId: input?.taskId,
  };
}
