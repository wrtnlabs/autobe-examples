import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeOrganizationDashboardSummary";
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

export async function patchErpHrmTimeMemberReportsOrganizationDashboardSummaries(props: {
  member: MemberPayload;
  body: IErpHrmTimeOrganizationDashboardSummary.IRequest;
}): Promise<IPageIErpHrmTimeOrganizationDashboardSummary> {
  const selectedMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        is_selected_context: true,
        deleted_at: null,
      },
      select: {
        erp_hrm_time_organization_id: true,
      },
    });
  if (selectedMembership === null) {
    throw new HttpException("Conflict", 409);
  }
  const employee = await MyGlobal.prisma.erp_hrm_time_employees.findFirst({
    where: {
      erp_hrm_time_member_id: props.member.id,
      erp_hrm_time_organization_id:
        selectedMembership.erp_hrm_time_organization_id,
      deleted_at: null,
    },
    select: {
      role: {
        select: {
          rolePermissions: {
            select: {
              permission: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (employee === null || employee.role === null) {
    throw new HttpException("Forbidden", 403);
  }
  const canViewReports = employee.role.rolePermissions.some(
    (item) => item.permission.id === "report viewing",
  );
  if (!canViewReports) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit === null || props.body.limit === undefined
      ? 100
      : props.body.limit;
  const skip = (page - 1) * limit;
  const where = {
    organization_id: selectedMembership.erp_hrm_time_organization_id,
    deleted_at: null,
    ...(props.body.dateFrom !== undefined
      ? { snapshot_date: { gte: props.body.dateFrom } }
      : {}),
    ...(props.body.dateTo !== undefined
      ? {
          snapshot_date: {
            ...(props.body.dateFrom !== undefined
              ? { gte: props.body.dateFrom }
              : {}),
            lte: props.body.dateTo,
          },
        }
      : {}),
  } satisfies Prisma.erp_hrm_time_organization_dashboard_summariesWhereInput;
  const data =
    await MyGlobal.prisma.erp_hrm_time_organization_dashboard_summaries.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: { snapshot_date: "desc" },
        select: {
          id: true,
          organization: {
            select: {
              id: true,
            },
          },
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
        },
      },
    );
  const records =
    await MyGlobal.prisma.erp_hrm_time_organization_dashboard_summaries.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: records === 0 ? 0 : Math.ceil(records / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      organization: {
        id: record.organization.id,
      } satisfies IErpHrmTimeOrganization.ISummary,
      snapshotDate: toISOStringSafe(record.snapshot_date),
      activeEmployeeCount: record.active_employee_count,
      pendingTimesheetCount: record.pending_timesheet_count,
      weeklyHoursTotal: record.weekly_hours_total,
      budgetUtilizationOver80Count: record.budget_utilization_over_80_count,
      topProjectId: record.top_project_id,
      topProjectBudgetHours: record.top_project_budget_hours,
      topProjectActualHours: record.top_project_actual_hours,
      topProjectBudgetUtilizationPercent:
        record.top_project_budget_utilization_percent,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    })),
  };
}
