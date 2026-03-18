import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectBudgetAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetAnalytic";
import { IHrmPlatformProjectDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectDashboard";
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

export async function getHrmPlatformMemberDashboardProjects(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformProjectDashboard> {
  // Get employee records for this member to find organization_id
  // Members don't directly belong to organizations - employees do
  const employees = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      organization_id: true,
    },
  });
  if (employees.length === 0) {
    throw new HttpException("No organization found for this member", 404);
  }
  // Use the first organization (in real app, session would specify which org context)
  const organizationId = employees[0].organization_id;
  // Calculate current week start (Monday 00:00 KST)
  // Current date: 2026-03-15T19:48:35.157Z is in Asia/Seoul timezone
  // 2026-03-15 is Sunday, so week start is 2026-03-09 Monday 00:00 KST
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysSinceMonday);
  weekStart.setUTCHours(0, 0, 0, 0);
  // Count total projects and breakdown by status
  const totalProjectsResult = await MyGlobal.prisma.hrm_platform_projects.count(
    {
      where: {
        organization_id: organizationId,
        deleted_at: null,
      },
    },
  );
  const statusCounts = await MyGlobal.prisma.hrm_platform_projects.groupBy({
    by: ["status"],
    where: {
      organization_id: organizationId,
      deleted_at: null,
    },
    _count: {
      id: true,
    },
  });
  let activeCount = 0;
  let archivedCount = 0;
  let completedCount = 0;
  for (const count of statusCounts) {
    if (count.status === "active") {
      activeCount = count._count.id;
    } else if (count.status === "archived") {
      archivedCount = count._count.id;
    } else if (count.status === "completed") {
      completedCount = count._count.id;
    }
  }
  const statusBreakdown = {
    active: activeCount,
    archived: archivedCount,
    completed: completedCount,
  };
  // Calculate budget utilization for projects with budget_hours
  const projectsWithBudget =
    await MyGlobal.prisma.hrm_platform_projects.findMany({
      where: {
        organization_id: organizationId,
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
            date: {
              gte: weekStart,
            },
            deleted_at: null,
          },
          select: {
            duration_minutes: true,
          },
        },
      },
    });
  const budgetUtilization: IHrmPlatformProjectBudgetAnalytic[] = [];
  for (const project of projectsWithBudget) {
    const actualMinutes = project.timelogs.reduce(
      (sum, timelog) => sum + timelog.duration_minutes,
      0,
    );
    const actualHours = actualMinutes / 60;
    const budgetHours = project.budget_hours;
    if (budgetHours !== null && budgetHours > 0) {
      const consumptionPercentage = (actualHours / budgetHours) * 100;
      if (consumptionPercentage > 80) {
        budgetUtilization.push({
          projectId: project.id,
          budgetHours: budgetHours,
          actualHours: actualHours,
          consumptionPercentage: consumptionPercentage,
          remainingHours: budgetHours - actualHours,
        });
      }
    }
  }
  // Get top 5 projects by hours logged this week
  const allProjects = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: {
      organization_id: organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      timelogs: {
        where: {
          date: {
            gte: weekStart,
          },
          deleted_at: null,
        },
        select: {
          duration_minutes: true,
        },
      },
    },
  });
  const projectsWithHours = allProjects.map((project) => {
    const totalMinutes = project.timelogs.reduce(
      (sum, timelog) => sum + timelog.duration_minutes,
      0,
    );
    const totalHours = totalMinutes / 60;
    return {
      projectId: project.id,
      projectName: project.name,
      totalHoursLogged: totalHours,
    };
  });
  projectsWithHours.sort((a, b) => b.totalHoursLogged - a.totalHoursLogged);
  const topProjectsByHours = projectsWithHours.slice(0, 5).map((p) => ({
    projectId: p.projectId,
    projectName: p.projectName,
    totalHoursLogged: p.totalHoursLogged,
  }));
  return {
    totalProjects: totalProjectsResult,
    statusBreakdown,
    budgetUtilization,
    topProjectsByHours,
  };
}
