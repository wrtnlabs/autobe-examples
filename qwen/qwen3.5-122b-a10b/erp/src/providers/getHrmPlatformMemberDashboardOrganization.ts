import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrganizationDashboard";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberDashboardOrganization(props: {
  member: MemberPayload;
}): Promise<IOrganizationDashboard> {
  // Find member's employee record to get organization context
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  const organizationId = employee.hrm_platform_organization_id;
  // 1. Active employee count
  const activeEmployeeCount =
    await MyGlobal.prisma.hrm_platform_employees.count({
      where: {
        hrm_platform_organization_id: organizationId,
        status: "active",
        deleted_at: null,
      },
    });
  // 2. Weekly hours total (current week Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      date: {
        gte: monday,
        lte: sunday,
      },
      deleted_at: null,
    },
    select: {
      duration_minutes: true,
    },
  });
  const totalMinutes = timelogs.reduce(
    (sum, tl) => sum + tl.duration_minutes,
    0,
  );
  const weeklyHoursTotal = totalMinutes / 60;
  // 3. Pending timesheet count
  const pendingTimesheetCount =
    await MyGlobal.prisma.hrm_platform_timesheets.count({
      where: {
        status: {
          in: ["submitted", "draft"],
        },
        employee: {
          hrm_platform_organization_id: organizationId,
        },
        deleted_at: null,
      },
    });
  // 4. Budget alerts (projects with > 80% budget utilization)
  const projectsWithBudget =
    await MyGlobal.prisma.hrm_platform_projects.findMany({
      where: {
        hrm_platform_organization_id: organizationId,
        budget_hours: {
          not: null,
          gt: 0,
        },
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        budget_hours: true,
      },
    });
  const budgetAlerts: IOrganizationDashboard.IBudgetAlert[] = [];
  for (const project of projectsWithBudget) {
    const projectTimelogs =
      await MyGlobal.prisma.hrm_platform_timelogs.findMany({
        where: {
          hrm_platform_project_id: project.id,
          date: {
            gte: monday,
            lte: sunday,
          },
          deleted_at: null,
        },
        select: {
          duration_minutes: true,
        },
      });
    const projectMinutes = projectTimelogs.reduce(
      (sum, tl) => sum + tl.duration_minutes,
      0,
    );
    const actualHours = projectMinutes / 60;
    const budgetHours = project.budget_hours ?? 0;
    if (budgetHours > 0) {
      const utilizationPercentage = (actualHours / budgetHours) * 100;
      if (utilizationPercentage > 80) {
        budgetAlerts.push({
          project_id: project.id,
          project_name: project.name,
          budget_hours: budgetHours,
          actual_hours: actualHours,
          utilization_percentage: utilizationPercentage,
        });
      }
    }
  }
  // 5. Top 5 performers by hours this week
  const topPerformersData = await MyGlobal.prisma.hrm_platform_timelogs.groupBy(
    {
      by: ["hrm_platform_employee_id"],
      where: {
        date: {
          gte: monday,
          lte: sunday,
        },
        deleted_at: null,
      },
      _sum: {
        duration_minutes: true,
      },
      orderBy: {
        _sum: {
          duration_minutes: "desc",
        },
      },
      take: 5,
    },
  );
  const topPerformers: IOrganizationDashboard.ITopPerformer[] =
    await ArrayUtil.asyncMap(topPerformersData, async (tp) => {
      const employeeRecord =
        await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
          where: {
            id: tp.hrm_platform_employee_id,
          },
          ...HrmPlatformEmployeeAtSummaryTransformer.select(),
        });
      const totalHours = (tp._sum.duration_minutes ?? 0) / 60;
      return {
        employee:
          await HrmPlatformEmployeeAtSummaryTransformer.transform(
            employeeRecord,
          ),
        total_hours: totalHours,
      };
    });
  return {
    active_employee_count: activeEmployeeCount,
    weekly_hours_total: weeklyHoursTotal,
    pending_timesheet_count: pendingTimesheetCount,
    budget_alerts: budgetAlerts,
    top_performers: topPerformers,
  };
}
