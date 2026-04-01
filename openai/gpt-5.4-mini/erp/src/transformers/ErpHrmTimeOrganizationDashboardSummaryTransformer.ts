import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeOrganizationDashboardSummaryTransformer {
  export type Payload =
    Prisma.erp_hrm_time_organization_dashboard_summariesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_date: true,
        active_employee_count: true,
        pending_timesheet_count: true,
        weekly_hours_total: true,
        budget_utilization_over_80_count: true,
        top_project_id: true,
        top_project_budget_hours: true,
        top_project_actual_hours: true,
        top_project_budget_utilization_percent: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_time_organization_dashboard_summariesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeOrganizationDashboardSummary> {
    return {
      id: input.id,
      organization: input.organization as IErpHrmTimeOrganization.ISummary,
      snapshotDate: input.snapshot_date.toISOString(),
      activeEmployeeCount: input.active_employee_count,
      pendingTimesheetCount: input.pending_timesheet_count,
      weeklyHoursTotal: input.weekly_hours_total,
      budgetUtilizationOver80Count: input.budget_utilization_over_80_count,
      topProjectId: input.top_project_id,
      topProjectBudgetHours: input.top_project_budget_hours,
      topProjectActualHours: input.top_project_actual_hours,
      topProjectBudgetUtilizationPercent:
        input.top_project_budget_utilization_percent,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
