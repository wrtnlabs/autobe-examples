import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberReportsOrganizationDashboardSummariesOrganizationDashboardSummaryId(props: {
  member: MemberPayload;
  organizationDashboardSummaryId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeOrganizationDashboardSummary> {
  const summary =
    await MyGlobal.prisma.erp_hrm_time_organization_dashboard_summaries.findUniqueOrThrow(
      {
        where: {
          id: props.organizationDashboardSummaryId,
        },
        select: {
          organization_id: true,
          deleted_at: true,
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
          organization: {
            select: {
              id: true,
            },
          },
        },
      },
    );
  if (summary.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (summary.organization.id !== summary.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: summary.id,
    organization: {
      id: summary.organization.id,
    } satisfies IErpHrmTimeOrganization.ISummary,
    snapshotDate: toISOStringSafe(summary.snapshot_date),
    activeEmployeeCount: summary.active_employee_count,
    pendingTimesheetCount: summary.pending_timesheet_count,
    weeklyHoursTotal: summary.weekly_hours_total,
    budgetUtilizationOver80Count: summary.budget_utilization_over_80_count,
    topProjectId: summary.top_project_id,
    topProjectBudgetHours: summary.top_project_budget_hours,
    topProjectActualHours: summary.top_project_actual_hours,
    topProjectBudgetUtilizationPercent:
      summary.top_project_budget_utilization_percent,
    createdAt: toISOStringSafe(summary.created_at),
    updatedAt: toISOStringSafe(summary.updated_at),
    deletedAt:
      summary.deleted_at === null ? null : toISOStringSafe(summary.deleted_at),
  } satisfies IErpHrmTimeOrganizationDashboardSummary;
}
