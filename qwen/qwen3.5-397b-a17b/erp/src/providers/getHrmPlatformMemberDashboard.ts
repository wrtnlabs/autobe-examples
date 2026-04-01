import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "../transformers/HrmPlatformTaskAtSummaryTransformer";
import { HrmPlatformTimelogAtSummaryTransformer } from "../transformers/HrmPlatformTimelogAtSummaryTransformer";
import { HrmPlatformTimerTransformer } from "../transformers/HrmPlatformTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberDashboard(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformDashboard> {
  const now = new Date();
  const seoulOffset = 9 * 60 * 60 * 1000;
  const seoulNow = new Date(now.getTime() + seoulOffset);
  const today = new Date(seoulNow);
  today.setHours(0, 0, 0, 0);
  const todayStart = new Date(today.getTime() - seoulOffset);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  const dayOfWeek = seoulNow.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(seoulNow);
  monday.setDate(seoulNow.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const weekStart = new Date(monday.getTime() - seoulOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const weekEnd = new Date(sunday.getTime() - seoulOffset);
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role_id: true,
      },
    });
  const hoursTodayResult =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        employee_id: employee.id,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
        deleted_at: null,
      },
      _sum: {
        duration_minutes: true,
      },
    });
  const hoursToday = (hoursTodayResult._sum.duration_minutes ?? 0) / 60;
  const hoursThisWeekResult =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        employee_id: employee.id,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
        deleted_at: null,
      },
      _sum: {
        duration_minutes: true,
      },
    });
  const hoursThisWeek = (hoursThisWeekResult._sum.duration_minutes ?? 0) / 60;
  const activeTimer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      employee_id: employee.id,
      deleted_at: null,
    },
    ...HrmPlatformTimerTransformer.select(),
  });
  const recentTimelogsData =
    await MyGlobal.prisma.hrm_platform_timelogs.findMany({
      where: {
        employee_id: employee.id,
        deleted_at: null,
      },
      orderBy: { date: "desc" },
      take: 5,
      ...HrmPlatformTimelogAtSummaryTransformer.select(),
    });
  const recentTimelogs = await ArrayUtil.asyncMap(
    recentTimelogsData,
    HrmPlatformTimelogAtSummaryTransformer.transform,
  );
  const weekStartDateStr = monday.toISOString().split("T")[0];
  const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
    where: {
      employee_id: employee.id,
      week_start_date: weekStartDateStr,
      deleted_at: null,
    },
    select: { status: true },
  });
  const timesheetStatus = typia.assert<
    "draft" | "none" | "submitted" | "approved" | "rejected"
  >(timesheet?.status ?? "none");
  const assignedTasksData = await MyGlobal.prisma.hrm_platform_tasks.findMany({
    where: {
      hrm_platform_employee_id: employee.id,
      status: { in: ["open", "in-progress"] },
      deleted_at: null,
    },
    ...HrmPlatformTaskAtSummaryTransformer.select(),
  });
  const assignedTasks = await ArrayUtil.asyncMap(
    assignedTasksData,
    HrmPlatformTaskAtSummaryTransformer.transform,
  );
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: employee.role_id,
        deleted_at: null,
      },
      select: { permission: true },
    });
  const hasReportView = rolePermissions.some(
    (rp) => rp.permission === "report:view",
  );
  let organization: IHrmPlatformDashboard.IOrganization | null = null;
  if (hasReportView) {
    const activeEmployeeCount =
      await MyGlobal.prisma.hrm_platform_employees.count({
        where: {
          organization_id: employee.organization_id,
          status: "active",
          deleted_at: null,
        },
      });
    const totalWeeklyHoursResult =
      await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
        where: {
          employee: {
            organization_id: employee.organization_id,
          },
          date: {
            gte: weekStart,
            lte: weekEnd,
          },
          deleted_at: null,
        },
        _sum: {
          duration_minutes: true,
        },
      });
    const totalWeeklyHours =
      (totalWeeklyHoursResult._sum.duration_minutes ?? 0) / 60;
    const pendingTimesheetsCount =
      await MyGlobal.prisma.hrm_platform_timesheets.count({
        where: {
          employee: {
            organization_id: employee.organization_id,
          },
          status: "submitted",
          deleted_at: null,
        },
      });
    const projectsWithBudget =
      await MyGlobal.prisma.hrm_platform_projects.findMany({
        where: {
          organization_id: employee.organization_id,
          budget_hours: { not: null },
          deleted_at: null,
        },
        select: {
          id: true,
          name: true,
          color_code: true,
          status: true,
          budget_hours: true,
          start_date: true,
          end_date: true,
          created_at: true,
          timelogs: {
            where: { deleted_at: null },
            select: { duration_minutes: true },
          } satisfies Prisma.hrm_platform_timelogsFindManyArgs,
        },
      });
    const highBudgetUtilizationProjects: IHrmPlatformDashboard.IOrganizationProjectBudgetUtilization[] =
      [];
    for (const project of projectsWithBudget) {
      const actualMinutes = project.timelogs.reduce(
        (sum, t) => sum + t.duration_minutes,
        0,
      );
      const actualHours = actualMinutes / 60;
      const budgetHours = project.budget_hours!;
      const utilizationPercentage = (actualHours / budgetHours) * 100;
      if (utilizationPercentage > 80) {
        highBudgetUtilizationProjects.push({
          project: {
            id: project.id,
            name: project.name,
            color_code: project.color_code,
            status: project.status,
            budget_hours: project.budget_hours ?? undefined,
            start_date: project.start_date?.toISOString() ?? undefined,
            end_date: project.end_date?.toISOString() ?? undefined,
            created_at: project.created_at.toISOString(),
          } satisfies IHrmPlatformProject.ISummary,
          budget_hours: budgetHours,
          actual_hours: actualHours,
          utilization_percentage: Math.round(utilizationPercentage * 100) / 100,
        });
      }
    }
    const topPerformersData =
      await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
        by: ["employee_id"],
        where: {
          employee: {
            organization_id: employee.organization_id,
          },
          date: {
            gte: weekStart,
            lte: weekEnd,
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
      });
    const topPerformers: IHrmPlatformDashboard.IOrganizationTopPerformer[] = [];
    for (const tp of topPerformersData) {
      const emp = await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow(
        {
          where: { id: tp.employee_id, deleted_at: null },
          ...HrmPlatformEmployeeAtSummaryTransformer.select(),
        },
      );
      topPerformers.push({
        employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(emp),
        totalHours: (tp._sum.duration_minutes ?? 0) / 60,
      });
    }
    organization = {
      activeEmployeeCount: activeEmployeeCount,
      totalWeeklyHours,
      pendingTimesheetsCount: pendingTimesheetsCount,
      highBudgetUtilizationProjects,
      topPerformers,
    } satisfies IHrmPlatformDashboard.IOrganization;
  }
  return {
    personal: {
      hoursToday,
      hoursThisWeek,
      activeTimer:
        activeTimer !== null
          ? await HrmPlatformTimerTransformer.transform(activeTimer)
          : null,
      recentTimelogs,
      timesheetStatus,
      assignedTasks,
    } satisfies IHrmPlatformDashboard.IPersonal,
    organization,
  } satisfies IHrmPlatformDashboard;
}
