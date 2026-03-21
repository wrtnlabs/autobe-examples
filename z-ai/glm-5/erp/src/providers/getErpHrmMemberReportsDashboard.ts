import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDashboard";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeAtSummaryTransformer } from "../transformers/ErpHrmEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberReportsDashboard(props: {
  member: MemberPayload;
}): Promise<IErpHrmDashboard.IOrganization> {
  // Get organization context from session
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  const organizationId = session.erp_hrm_organization_id;
  if (organizationId === null) {
    throw new HttpException("No organization context selected", 400);
  }
  // Calculate current week boundaries (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  // 1. Count active employees
  const totalActiveEmployees = await MyGlobal.prisma.erp_hrm_employees.count({
    where: {
      erp_hrm_organization_id: organizationId,
      status: "active",
      deleted_at: null,
    },
  });
  // 2. Calculate weekly hours from timelogs
  const weeklyTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      employee: {
        erp_hrm_organization_id: organizationId,
      },
      date: {
        gte: weekStart,
        lt: weekEnd,
      },
      deleted_at: null,
    },
    select: { duration: true },
  });
  const weeklyHours =
    weeklyTimelogs.reduce((sum, t) => sum + t.duration, 0) / 60;
  // 3. Count pending timesheets
  const pendingApprovals = await MyGlobal.prisma.erp_hrm_timesheets.count({
    where: {
      employee: {
        erp_hrm_organization_id: organizationId,
      },
      status: "submitted",
      deleted_at: null,
    },
  });
  // 4. Budget alerts - projects over 80% utilization
  const projectsWithBudget = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: {
      organization_id: organizationId,
      budget_hours: { not: null },
      deleted_at: null,
    },
    select: { id: true, name: true, budget_hours: true },
  });
  const projectTimelogSums = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
    by: ["project_id"],
    where: {
      project_id: { in: projectsWithBudget.map((p) => p.id) },
      deleted_at: null,
    },
    _sum: { duration: true },
  });
  const projectHoursMap = new Map(
    projectTimelogSums.map((item) => [
      item.project_id,
      (item._sum.duration ?? 0) / 60,
    ]),
  );
  const budgetAlerts: IErpHrmOrganizationDashboard.IBudgetAlert[] =
    projectsWithBudget
      .filter(
        (
          project,
        ): project is {
          id: string;
          name: string;
          budget_hours: number;
        } => project.budget_hours !== null,
      )
      .map((project) => {
        const actualHours = projectHoursMap.get(project.id) ?? 0;
        const utilization = (actualHours / project.budget_hours) * 100;
        return {
          project_id: project.id,
          project_name: project.name,
          budget_hours: project.budget_hours,
          actual_hours: actualHours,
          utilization_percentage: Math.round(utilization * 10) / 10,
        };
      })
      .filter((alert) => alert.utilization_percentage > 80)
      .sort((a, b) => b.utilization_percentage - a.utilization_percentage);
  // 5. Top performers by hours this week
  const topEmployeesAgg = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
    by: ["employee_id"],
    where: {
      employee: {
        erp_hrm_organization_id: organizationId,
        status: "active",
        deleted_at: null,
      },
      date: {
        gte: weekStart,
        lt: weekEnd,
      },
      deleted_at: null,
    },
    _sum: { duration: true },
    orderBy: { _sum: { duration: "desc" } },
    take: 5,
  });
  const employeeIds = topEmployeesAgg.map((item) => item.employee_id);
  const employees = await MyGlobal.prisma.erp_hrm_employees.findMany({
    where: { id: { in: employeeIds } },
    ...ErpHrmEmployeeAtSummaryTransformer.select(),
  });
  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const topPerformers: IErpHrmOrganizationDashboard.ITopPerformer[] = [];
  for (const item of topEmployeesAgg) {
    const employee = employeeMap.get(item.employee_id);
    if (employee !== undefined) {
      topPerformers.push({
        employee: await ErpHrmEmployeeAtSummaryTransformer.transform(employee),
        hours_logged: (item._sum.duration ?? 0) / 60,
      });
    }
  }
  return {
    totalActiveEmployees,
    weeklyHours,
    pendingApprovals,
    budgetAlerts,
    topPerformers,
  };
}
