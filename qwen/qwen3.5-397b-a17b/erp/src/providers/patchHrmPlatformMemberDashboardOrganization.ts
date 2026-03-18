import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
import { IHrmPlatformProjectBudgetAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetAnalytic";
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

export async function patchHrmPlatformMemberDashboardOrganization(props: {
  member: MemberPayload;
  body: IHrmPlatformOrganizationDashboard.IRequest;
}): Promise<IHrmPlatformOrganizationDashboard> {
  // Get member's session to determine organization context
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { member_id: true },
    });
  // Get employee record to find organization and role
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: session.member_id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
        role_id: true,
      },
    });
  // Check if user has report:view permission
  const hasReportViewPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        role_id: employee.role_id,
        permission: "report:view",
        deleted_at: null,
      },
    });
  if (!hasReportViewPermission) {
    throw new HttpException("Forbidden: Missing report:view permission", 403);
  }
  // Calculate week date range
  const now = new Date();
  const weekStartDate = props.body.week_start_date
    ? new Date(props.body.week_start_date)
    : getWeekStart(now);
  const weekEndDate = props.body.week_end_date
    ? new Date(props.body.week_end_date)
    : getWeekEnd(now);
  // 1. Total active employees
  const totalActiveEmployeesCount =
    await MyGlobal.prisma.hrm_platform_employees.count({
      where: {
        organization_id: employee.organization_id,
        status: "active",
        deleted_at: null,
      },
    });
  // 2. Total hours logged this week
  const totalHoursResult =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      _sum: {
        duration_minutes: true,
      },
      where: {
        employee: {
          organization_id: employee.organization_id,
          deleted_at: null,
        },
        date: {
          gte: weekStartDate,
          lte: weekEndDate,
        },
        deleted_at: null,
      },
    });
  const totalHoursThisWeek = (totalHoursResult._sum.duration_minutes ?? 0) / 60;
  // 3. Pending timesheets count (status = 'submitted')
  const pendingTimesheetsCountValue =
    await MyGlobal.prisma.hrm_platform_timesheets.count({
      where: {
        employee: {
          organization_id: employee.organization_id,
          deleted_at: null,
        },
        status: "submitted",
        deleted_at: null,
      },
    });
  // 4. Projects over budget (>80% utilization)
  const allProjects = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: {
      organization_id: employee.organization_id,
      budget_hours: {
        not: null,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      budget_hours: true,
      timelogs: {
        where: {
          deleted_at: null,
        },
        select: {
          duration_minutes: true,
        },
      },
    },
  });
  const projectsOverBudget: IHrmPlatformProjectBudgetAnalytic[] = [];
  for (const project of allProjects) {
    const budgetHours = project.budget_hours ?? 0;
    const actualHours =
      project.timelogs.reduce((sum, log) => sum + log.duration_minutes, 0) / 60;
    const consumptionPercentage =
      budgetHours > 0 ? (actualHours / budgetHours) * 100 : 0;
    if (consumptionPercentage > 80) {
      projectsOverBudget.push({
        projectId: project.id,
        budgetHours: project.budget_hours ?? null,
        actualHours: actualHours,
        consumptionPercentage: consumptionPercentage,
        remainingHours:
          project.budget_hours !== null
            ? project.budget_hours - actualHours
            : null,
      });
    }
  }
  // 5. Top 5 employees by hours logged this week
  const topEmployeesData =
    await MyGlobal.prisma.hrm_platform_employees.findMany({
      where: {
        organization_id: employee.organization_id,
        status: "active",
        deleted_at: null,
      },
      select: {
        id: true,
        display_name: true,
        timelogs: {
          where: {
            date: {
              gte: weekStartDate,
              lte: weekEndDate,
            },
            deleted_at: null,
          },
          select: {
            duration_minutes: true,
          },
        },
      },
    });
  const topEmployeesWithHours = topEmployeesData.map((emp) => ({
    employeeId: emp.id,
    name: emp.display_name,
    totalHours:
      emp.timelogs.reduce((sum, log) => sum + log.duration_minutes, 0) / 60,
  }));
  topEmployeesWithHours.sort((a, b) => b.totalHours - a.totalHours);
  const topEmployeesByHours = topEmployeesWithHours.slice(0, 5);
  return {
    totalActiveEmployees: totalActiveEmployeesCount,
    totalHoursThisWeek: totalHoursThisWeek,
    pendingTimesheetsCount: pendingTimesheetsCountValue,
    projectsOverBudget: projectsOverBudget,
    topEmployeesByHours: topEmployeesByHours,
  };
}
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}
