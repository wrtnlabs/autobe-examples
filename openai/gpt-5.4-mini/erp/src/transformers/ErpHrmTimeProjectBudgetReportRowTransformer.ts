import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectBudgetReportRow";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer } from "./ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer";
import { ErpHrmTimeProjectAtSummaryTransformer } from "./ErpHrmTimeProjectAtSummaryTransformer";

export namespace ErpHrmTimeProjectBudgetReportRowTransformer {
  export type Payload =
    Prisma.erp_hrm_time_project_budget_report_rowsGetPayload<
      ReturnType<typeof select>
    >;
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeProjectBudgetReportRow> {
    return {
      id: input.id,
      organization:
        await ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.transform(
          input.organization,
        ),
      project: await ErpHrmTimeProjectAtSummaryTransformer.transform(
        input.project,
      ),
      reportDate: input.report_date.toISOString(),
      periodStartDate: input.period_start_date.toISOString(),
      periodEndDate: input.period_end_date.toISOString(),
      budgetHours: input.budget_hours,
      actualHours: input.actual_hours,
      utilizationPercent: input.utilization_percent,
      billableHours: input.billable_hours,
      nonBillableHours: input.non_billable_hours,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        report_date: true,
        period_start_date: true,
        period_end_date: true,
        budget_hours: true,
        actual_hours: true,
        utilization_percent: true,
        billable_hours: true,
        non_billable_hours: true,
        organization:
          ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.select(),
        project: ErpHrmTimeProjectAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_time_project_budget_report_rowsFindManyArgs;
  }
}
