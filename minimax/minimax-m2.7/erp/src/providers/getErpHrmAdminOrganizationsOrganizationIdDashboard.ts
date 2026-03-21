import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmActivityLogAtSummaryTransformer } from "../transformers/ErpHrmActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminOrganizationsOrganizationIdDashboard(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmOrganization> {
  // 1. Validate organization exists
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: {
        id: true,
        name: true,
        currency: true,
        timezone: true,
      },
    });
  // 2. Employee statistics - group by status
  const employeeByStatus = await MyGlobal.prisma.erp_hrm_employees.groupBy({
    by: ["status"],
    where: { erp_hrm_organization_id: props.organizationId },
    _count: { id: true },
  });
  const activeEmployees =
    employeeByStatus.find((e) => e.status === "active")?._count.id ?? 0;
  const deactivatedEmployees =
    employeeByStatus.find((e) => e.status === "deactivated")?._count.id ?? 0;
  // Group by employment type
  const employeeByType = await MyGlobal.prisma.erp_hrm_employees.groupBy({
    by: ["employment_type"],
    where: { erp_hrm_organization_id: props.organizationId },
    _count: { id: true },
  });
  const getCountByType = (type: string) =>
    employeeByType.find((e) => e.employment_type === type)?._count.id ?? 0;
  // 3. Project statistics
  const projectByStatus = await MyGlobal.prisma.erp_hrm_projects.groupBy({
    by: ["status"],
    where: { erp_hrm_organization_id: props.organizationId },
    _count: { id: true },
    _sum: { budget_hours: true },
  });
  const activeProjects =
    projectByStatus.find((p) => p.status === "active")?._count.id ?? 0;
  const archivedProjects =
    projectByStatus.find((p) => p.status === "archived")?._count.id ?? 0;
  const completedProjects =
    projectByStatus.find((p) => p.status === "completed")?._count.id ?? 0;
  const totalBudgetHours = projectByStatus.reduce(
    (sum, p) => sum + (p._sum.budget_hours ?? 0),
    0,
  );
  // Calculate utilized budget hours from timelogs
  const utilizedBudgetResult = await MyGlobal.prisma.erp_hrm_timelogs.aggregate(
    {
      where: {
        project: {
          erp_hrm_organization_id: props.organizationId,
        },
      },
      _sum: { duration_minutes: true },
    },
  );
  const utilizedBudgetHours = utilizedBudgetResult._sum.duration_minutes
    ? utilizedBudgetResult._sum.duration_minutes / 60
    : null;
  const budgetUtilizationPercentage =
    totalBudgetHours > 0 && utilizedBudgetHours !== null
      ? (utilizedBudgetHours / totalBudgetHours) * 100
      : null;
  // 4. Task metrics - get project IDs first
  const projectIds = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: { erp_hrm_organization_id: props.organizationId },
    select: { id: true },
  });
  const projectIdList = projectIds.map((p) => p.id);
  const taskByStatus = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["status"],
    where: { erp_hrm_project_id: { in: projectIdList } },
    _count: { id: true },
  });
  const openTasks =
    taskByStatus.find((t) => t.status === "open")?._count.id ?? 0;
  const inProgressTasks =
    taskByStatus.find((t) => t.status === "in-progress")?._count.id ?? 0;
  const completedTasksCount =
    taskByStatus.find((t) => t.status === "completed")?._count.id ?? 0;
  const closedTasks =
    taskByStatus.find((t) => t.status === "closed")?._count.id ?? 0;
  const taskByPriority = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["priority"],
    where: { erp_hrm_project_id: { in: projectIdList } },
    _count: { id: true },
  });
  const lowPriority =
    taskByPriority.find((t) => t.priority === "low")?._count.id ?? 0;
  const mediumPriority =
    taskByPriority.find((t) => t.priority === "medium")?._count.id ?? 0;
  const highPriority =
    taskByPriority.find((t) => t.priority === "high")?._count.id ?? 0;
  const urgentPriority =
    taskByPriority.find((t) => t.priority === "urgent")?._count.id ?? 0;
  const totalTasks =
    openTasks + inProgressTasks + completedTasksCount + closedTasks;
  const completionRate =
    totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0;
  // 5. Time tracking aggregates - get all timelogs for the org
  const allTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      employee: {
        erp_hrm_organization_id: props.organizationId,
      },
    },
    select: {
      date: true,
      duration_minutes: true,
      billable: true,
    },
  });
  // Calculate week/month boundaries
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const weekTimelogs = allTimelogs.filter((t) => t.date >= weekStart);
  const monthTimelogs = allTimelogs.filter((t) => t.date >= monthStart);
  const hoursThisWeek =
    weekTimelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
  const hoursThisMonth =
    monthTimelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
  const billableHours =
    monthTimelogs
      .filter((t) => t.billable)
      .reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
  const nonBillableHours =
    monthTimelogs
      .filter((t) => !t.billable)
      .reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
  // Average daily hours for current month
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const averageDailyHours = hoursThisMonth / daysInMonth;
  // 6. Recent activity
  const recentActivityLogs =
    await MyGlobal.prisma.erp_hrm_activity_logs.findMany({
      where: { erp_hrm_organization_id: props.organizationId },
      orderBy: { created_at: "desc" },
      take: 10,
      ...ErpHrmActivityLogAtSummaryTransformer.select(),
    });
  const recentActivity = await ArrayUtil.asyncMap(
    recentActivityLogs,
    ErpHrmActivityLogAtSummaryTransformer.transform,
  );
  // 7. Return dashboard response
  return {
    organization: {
      id: organization.id,
      name: organization.name,
      employee_count: activeEmployees,
      currency: organization.currency,
      timezone: organization.timezone,
    },
    employeeStatistics: {
      total_count: activeEmployees + deactivatedEmployees,
      by_status: {
        active: activeEmployees,
        deactivated: deactivatedEmployees,
      },
      by_employment_type: {
        full_time: getCountByType("full-time"),
        part_time: getCountByType("part-time"),
        contractor: getCountByType("contractor"),
        intern: getCountByType("intern"),
      },
    },
    projectOverview: {
      total_count: activeProjects + archivedProjects + completedProjects,
      by_status: {
        active: activeProjects,
        archived: archivedProjects,
        completed: completedProjects,
      },
      total_budget_hours: totalBudgetHours,
      utilized_budget_hours: utilizedBudgetHours,
      budget_utilization_percentage: budgetUtilizationPercentage,
    },
    taskMetrics: {
      total_count: totalTasks,
      by_status: {
        open: openTasks,
        in_progress: inProgressTasks,
        completed: completedTasksCount,
        closed: closedTasks,
      },
      by_priority: {
        low: lowPriority,
        medium: mediumPriority,
        high: highPriority,
        urgent: urgentPriority,
      },
      completion_rate: completionRate,
    },
    timeTracking: {
      hours_logged_this_week: hoursThisWeek,
      hours_logged_this_month: hoursThisMonth,
      billable_hours: billableHours,
      non_billable_hours: nonBillableHours,
      average_daily_hours: averageDailyHours,
    },
    recentActivity: recentActivity,
  } satisfies IErpHrmOrganization;
}
