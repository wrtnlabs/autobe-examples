import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getErpHrmMemberDashboardsOrganization(props: {
  member: MemberPayload;
}): Promise<IErpHrmOrganizationDashboard> {
  // Get organization context from member's session
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization context selected", 400);
  }
  const organizationId = session.erp_hrm_organization_id;
  // Calculate current week bounds (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  // 1. Total active employees
  const totalActiveEmployees = await MyGlobal.prisma.erp_hrm_employees.count({
    where: {
      erp_hrm_organization_id: organizationId,
      status: "active",
      deleted_at: null,
    },
  });
  // 2. Weekly hours - get all timelogs for employees in this org for current week
  const weeklyTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      employee: {
        erp_hrm_organization_id: organizationId,
        deleted_at: null,
      },
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
      deleted_at: null,
    },
    select: { duration: true },
  });
  const weeklyHours =
    weeklyTimelogs.reduce((sum, t) => sum + t.duration, 0) / 60;
  // 3. Pending approvals - timesheets with submitted status
  const pendingApprovals = await MyGlobal.prisma.erp_hrm_timesheets.count({
    where: {
      employee: {
        erp_hrm_organization_id: organizationId,
      },
      status: "submitted",
      deleted_at: null,
    },
  });
  // 4. Budget alerts - projects with >80% budget utilization
  const projectsWithBudget = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: {
      organization_id: organizationId,
      budget_hours: { not: null },
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      budget_hours: true,
    },
  });
  const budgetAlerts: IErpHrmOrganizationDashboard.IBudgetAlert[] = [];
  for (const project of projectsWithBudget) {
    if (project.budget_hours === null || project.budget_hours === 0) {
      continue;
    }
    const projectTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
      where: {
        project_id: project.id,
        deleted_at: null,
      },
      select: { duration: true },
    });
    const actualHours =
      projectTimelogs.reduce((sum, t) => sum + t.duration, 0) / 60;
    const utilizationPercentage = (actualHours / project.budget_hours) * 100;
    if (utilizationPercentage > 80) {
      budgetAlerts.push({
        project_id: project.id,
        project_name: project.name,
        budget_hours: project.budget_hours,
        actual_hours: actualHours,
        utilization_percentage: Math.min(
          100,
          Math.round(utilizationPercentage * 10) / 10,
        ),
      });
    }
  }
  budgetAlerts.sort(
    (a, b) => b.utilization_percentage - a.utilization_percentage,
  );
  // 5. Top performers - top 5 employees by hours this week
  const topPerformerData = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
    by: ["employee_id"],
    where: {
      employee: {
        erp_hrm_organization_id: organizationId,
        deleted_at: null,
      },
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
      deleted_at: null,
    },
    _sum: {
      duration: true,
    },
    orderBy: {
      _sum: {
        duration: "desc",
      },
    },
    take: 5,
  });
  const topPerformers: IErpHrmOrganizationDashboard.ITopPerformer[] = [];
  for (const data of topPerformerData) {
    const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
      where: { id: data.employee_id },
      ...ErpHrmEmployeeAtSummaryTransformer.select(),
    });
    topPerformers.push({
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(employee),
      hours_logged: (data._sum.duration ?? 0) / 60,
    });
  }
  return {
    total_active_employees: totalActiveEmployees,
    weekly_hours: weeklyHours,
    pending_approvals: pendingApprovals,
    budget_alerts: budgetAlerts,
    top_performers: topPerformers,
  };
}
