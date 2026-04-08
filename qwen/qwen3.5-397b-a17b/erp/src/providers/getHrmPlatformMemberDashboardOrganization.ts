import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
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

export async function getHrmPlatformMemberDashboardOrganization(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformOrganizationDashboard> {
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirst({
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  if (!membership) {
    throw new HttpException("Member has no organization membership", 403);
  }
  const organizationId = membership.hrm_platform_organization_id;
  const now = new Date();
  const currentDay = now.getUTCDay();
  const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  const activeEmployeesCount =
    await MyGlobal.prisma.hrm_platform_employees.count({
      where: {
        organization_id: organizationId,
        status: "active",
        deleted_at: null,
      },
    });
  const timelogResult = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
    _sum: {
      duration_minutes: true,
    },
    where: {
      employee: {
        organization_id: organizationId,
      },
      date: {
        gte: monday,
        lte: sunday,
      },
      deleted_at: null,
    },
  });
  const totalHoursThisWeek = (timelogResult._sum.duration_minutes ?? 0) / 60;
  const pendingTimesheetsCount =
    await MyGlobal.prisma.hrm_platform_timesheets.count({
      where: {
        employee: {
          organization_id: organizationId,
        },
        status: "submitted",
        deleted_at: null,
      },
    });
  const projectsWithTimelogs =
    await MyGlobal.prisma.hrm_platform_projects.findMany({
      where: {
        organization_id: organizationId,
        budget_hours: {
          gt: 0,
        },
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        budget_hours: true,
        timelogs: {
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
        },
      },
    });
  const projectsOverBudget: IHrmPlatformOrganizationDashboard.IProjectBudget[] =
    projectsWithTimelogs
      .map((project) => {
        const actualHours =
          project.timelogs.reduce((sum, log) => sum + log.duration_minutes, 0) /
          60;
        const budgetHours = project.budget_hours ?? 0;
        const utilizationPercentage =
          budgetHours > 0 ? (actualHours / budgetHours) * 100 : 0;
        if (utilizationPercentage < 80) {
          return null;
        }
        return {
          id: project.id,
          name: project.name,
          budgetHours: budgetHours,
          actualHours: actualHours,
          utilizationPercentage: Math.min(utilizationPercentage, 100),
        } satisfies IHrmPlatformOrganizationDashboard.IProjectBudget;
      })
      .filter(
        (p): p is IHrmPlatformOrganizationDashboard.IProjectBudget =>
          p !== null,
      );
  const topEmployeesRaw = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
    by: ["hrm_platform_employee_id"],
    _sum: {
      duration_minutes: true,
    },
    where: {
      employee: {
        organization_id: organizationId,
      },
      date: {
        gte: monday,
        lte: sunday,
      },
      deleted_at: null,
    },
    orderBy: {
      _sum: {
        duration_minutes: "desc",
      },
    },
    take: 5,
  });
  const employeeIds = topEmployeesRaw.map((e) => e.hrm_platform_employee_id);
  const employees = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where: {
      id: {
        in: employeeIds,
      },
    },
    select: {
      id: true,
      member: {
        select: {
          profile: {
            select: {
              display_name: true,
            },
          },
        },
      },
    },
  });
  const employeeMap = new Map(
    employees.map((e) => [e.id, e.member.profile?.display_name ?? "Unknown"]),
  );
  const topEmployees: IHrmPlatformOrganizationDashboard.ITopEmployee[] =
    topEmployeesRaw.map(
      (e) =>
        ({
          employeeId: e.hrm_platform_employee_id,
          displayName: employeeMap.get(e.hrm_platform_employee_id) ?? "Unknown",
          totalMinutes: e._sum.duration_minutes ?? 0,
        }) satisfies IHrmPlatformOrganizationDashboard.ITopEmployee,
    );
  return {
    activeEmployeesCount: activeEmployeesCount,
    totalHoursThisWeek: totalHoursThisWeek,
    pendingTimesheetsCount: pendingTimesheetsCount,
    projectsOverBudget: projectsOverBudget,
    topEmployees: topEmployees,
  } satisfies IHrmPlatformOrganizationDashboard;
}
