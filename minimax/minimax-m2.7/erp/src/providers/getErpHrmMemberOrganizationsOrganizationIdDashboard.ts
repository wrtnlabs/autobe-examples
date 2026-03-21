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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberOrganizationsOrganizationIdDashboard(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmOrganization> {
  // Step 1: Validate organization exists
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
  // Step 2: Verify member belongs to organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Get organization timezone for date calculations
  const timezone = organization.timezone;
  // Helper to get start and end of current week/month in organization timezone
  const now = new Date();
  const orgNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  // Get start of current week (Sunday)
  const dayOfWeek = orgNow.getDay();
  const startOfWeek = new Date(orgNow);
  startOfWeek.setDate(orgNow.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  // Get start of current month
  const startOfMonth = new Date(
    orgNow.getFullYear(),
    orgNow.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );
  // Step 4: Query employee statistics
  const employeeStatsRaw = await MyGlobal.prisma.erp_hrm_employees.groupBy({
    by: ["status", "employment_type"],
    where: {
      erp_hrm_organization_id: props.organizationId,
      deleted_at: null,
    },
    _count: { id: true },
  });
  const employeeCount = await MyGlobal.prisma.erp_hrm_employees.count({
    where: {
      erp_hrm_organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  const activeEmployees = employeeStatsRaw
    .filter((e) => e.status === "active")
    .reduce((sum, e) => sum + e._count.id, 0);
  const deactivatedEmployees = employeeStatsRaw
    .filter((e) => e.status === "deactivated")
    .reduce((sum, e) => sum + e._count.id, 0);
  const employeeStatistics = {
    total_count: employeeCount,
    by_status: {
      active: activeEmployees,
      deactivated: deactivatedEmployees,
    },
    by_employment_type: {
      full_time:
        employeeStatsRaw.find((e) => e.employment_type === "full-time")?._count
          .id ?? 0,
      part_time:
        employeeStatsRaw.find((e) => e.employment_type === "part-time")?._count
          .id ?? 0,
      contractor:
        employeeStatsRaw.find((e) => e.employment_type === "contractor")?._count
          .id ?? 0,
      intern:
        employeeStatsRaw.find((e) => e.employment_type === "intern")?._count
          .id ?? 0,
    },
  };
  // Step 5: Query project statistics
  const projectStatsRaw = await MyGlobal.prisma.erp_hrm_projects.groupBy({
    by: ["status"],
    where: {
      erp_hrm_organization_id: props.organizationId,
    },
    _count: { id: true },
    _sum: { budget_hours: true },
  });
  const totalProjects = projectStatsRaw.reduce(
    (sum, p) => sum + p._count.id,
    0,
  );
  const totalBudgetHours = projectStatsRaw.reduce(
    (sum, p) => sum + (p._sum.budget_hours ?? 0),
    0,
  );
  // Calculate utilized budget hours from timelogs
  const utilizedBudgetResult = await MyGlobal.prisma.erp_hrm_timelogs.aggregate(
    {
      where: {
        employee: {
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
    totalBudgetHours && utilizedBudgetHours
      ? (utilizedBudgetHours / totalBudgetHours) * 100
      : null;
  const projectOverview = {
    total_count: totalProjects,
    by_status: {
      active:
        projectStatsRaw.find((p) => p.status === "active")?._count.id ?? 0,
      archived:
        projectStatsRaw.find((p) => p.status === "archived")?._count.id ?? 0,
      completed:
        projectStatsRaw.find((p) => p.status === "completed")?._count.id ?? 0,
    },
    total_budget_hours: totalBudgetHours > 0 ? totalBudgetHours : null,
    utilized_budget_hours: utilizedBudgetHours,
    budget_utilization_percentage: budgetUtilizationPercentage,
  };
  // Step 6: Query task metrics
  const projectIds = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: { erp_hrm_organization_id: props.organizationId },
    select: { id: true },
  });
  const projectIdList = projectIds.map((p) => p.id);
  const taskStatsRaw = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["status", "priority"],
    where: {
      erp_hrm_project_id: { in: projectIdList },
    },
    _count: { id: true },
  });
  const totalTasks = taskStatsRaw.reduce((sum, t) => sum + t._count.id, 0);
  const completedTasks = taskStatsRaw
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t._count.id, 0);
  const completionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const taskMetrics = {
    total_count: totalTasks,
    by_status: {
      open: taskStatsRaw.find((t) => t.status === "open")?._count.id ?? 0,
      in_progress:
        taskStatsRaw.find((t) => t.status === "in-progress")?._count.id ?? 0,
      completed: completedTasks,
      closed: taskStatsRaw.find((t) => t.status === "closed")?._count.id ?? 0,
    },
    by_priority: {
      low: taskStatsRaw.find((t) => t.priority === "low")?._count.id ?? 0,
      medium: taskStatsRaw.find((t) => t.priority === "medium")?._count.id ?? 0,
      high: taskStatsRaw.find((t) => t.priority === "high")?._count.id ?? 0,
      urgent: taskStatsRaw.find((t) => t.priority === "urgent")?._count.id ?? 0,
    },
    completion_rate: completionRate,
  };
  // Step 7: Query time tracking aggregates (optimized: single query for monthly, filter in JS for weekly)
  const monthlyTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      employee: {
        erp_hrm_organization_id: props.organizationId,
      },
      date: { gte: startOfMonth },
    },
    select: {
      duration_minutes: true,
      billable: true,
      date: true,
    },
  });
  // Filter for weekly from monthly results
  const weeklyTimelogs = monthlyTimelogs.filter((t) => t.date >= startOfWeek);
  const hoursLoggedThisWeek =
    weeklyTimelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
  const hoursLoggedThisMonth =
    monthlyTimelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
  const billableHours =
    monthlyTimelogs
      .filter((t) => t.billable)
      .reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
  const nonBillableHours =
    monthlyTimelogs
      .filter((t) => !t.billable)
      .reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
  // Calculate days in current month
  const currentDay = orgNow.getDate();
  const averageDailyHours =
    currentDay > 0 ? hoursLoggedThisMonth / currentDay : 0;
  const timeTracking = {
    hours_logged_this_week: hoursLoggedThisWeek,
    hours_logged_this_month: hoursLoggedThisMonth,
    billable_hours: billableHours,
    non_billable_hours: nonBillableHours,
    average_daily_hours: averageDailyHours,
  };
  // Step 8: Query recent activity (last 10 entries)
  const recentActivityRaw =
    await MyGlobal.prisma.erp_hrm_activity_logs.findMany({
      where: {
        erp_hrm_organization_id: props.organizationId,
      },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        id: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        member: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_uri: true,
            phone: true,
            created_at: true,
          },
        },
        created_at: true,
      },
    });
  const recentActivity: IErpHrmActivityLog.ISummary[] = recentActivityRaw.map(
    (log) => ({
      id: log.id as string & tags.Format<"uuid">,
      action_type: log.action_type,
      target_entity_type: log.target_entity_type,
      target_entity_id: log.target_entity_id as string & tags.Format<"uuid">,
      member: {
        id: log.member.id as string & tags.Format<"uuid">,
        email: log.member.email as string & tags.Format<"email">,
        displayName: log.member.display_name,
        avatarUri: log.member.avatar_uri,
        phone: log.member.phone,
        createdAt: toISOStringSafe(log.member.created_at),
      } satisfies IErpHrmMember.ISummary,
      created_at: toISOStringSafe(log.created_at),
    }),
  );
  // Step 9: Return comprehensive dashboard response
  return {
    organization: {
      id: organization.id as string & tags.Format<"uuid">,
      name: organization.name,
      employee_count: employeeCount,
      currency: organization.currency,
      timezone: organization.timezone,
    },
    employeeStatistics,
    projectOverview,
    taskMetrics,
    timeTracking,
    recentActivity,
  };
}
