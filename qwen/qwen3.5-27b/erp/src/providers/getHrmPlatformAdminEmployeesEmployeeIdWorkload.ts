import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformAdminEmployeesEmployeeIdWorkload(props: {
  admin: AdminPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformEmployee.IWorkload> {
  // Verify employee exists and get organization context
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  // Verify admin belongs to the same organization
  const adminRecord = await MyGlobal.prisma.hrm_platform_admins.findUnique({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (adminRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Calculate date boundaries for this week (Monday-Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  // Calculate date boundaries for this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  // Calculate hours this week
  const hoursThisWeekResult =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        hrm_platform_employee_id: props.employeeId,
        deleted_at: null,
        date: {
          gte: monday,
          lte: sunday,
        },
      },
      _sum: {
        duration: true,
      },
    });
  const hoursThisWeek = (hoursThisWeekResult._sum.duration ?? 0) / 60;
  // Calculate hours this month
  const hoursThisMonthResult =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        hrm_platform_employee_id: props.employeeId,
        deleted_at: null,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: {
        duration: true,
      },
    });
  const hoursThisMonth = (hoursThisMonthResult._sum.duration ?? 0) / 60;
  // Calculate hours all time
  const hoursAllTimeResult =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        hrm_platform_employee_id: props.employeeId,
        deleted_at: null,
      },
      _sum: {
        duration: true,
      },
    });
  const hoursAllTime = (hoursAllTimeResult._sum.duration ?? 0) / 60;
  // Check for active timer
  const activeTimer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      hrm_platform_employee_id: props.employeeId,
      stopped_at: null,
      deleted_at: null,
    },
    select: {
      hrm_platform_project_id: true,
      hrm_platform_task_id: true,
      started_at: true,
    },
  });
  // Count assigned tasks (non-completed)
  const assignedTasksCount = await MyGlobal.prisma.hrm_platform_tasks.count({
    where: {
      assigned_employee_id: props.employeeId,
      status: { not: "completed" },
      deleted_at: null,
    },
  });
  // Count pending timesheets (submitted)
  const pendingTimesheetsCount =
    await MyGlobal.prisma.hrm_platform_timesheets.count({
      where: {
        hrm_platform_employee_id: props.employeeId,
        status: "submitted",
        deleted_at: null,
      },
    });
  // Calculate billable hours
  const billableHoursResult =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        hrm_platform_employee_id: props.employeeId,
        billable: true,
        deleted_at: null,
      },
      _sum: {
        duration: true,
      },
    });
  const billableHours = (billableHoursResult._sum.duration ?? 0) / 60;
  // Calculate non-billable hours
  const nonBillableHoursResult =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        hrm_platform_employee_id: props.employeeId,
        billable: false,
        deleted_at: null,
      },
      _sum: {
        duration: true,
      },
    });
  const nonBillableHours = (nonBillableHoursResult._sum.duration ?? 0) / 60;
  // Get hours by project
  const hoursByProjectRaw = await MyGlobal.prisma.hrm_platform_timelogs.groupBy(
    {
      by: ["hrm_platform_project_id"],
      where: {
        hrm_platform_employee_id: props.employeeId,
        deleted_at: null,
      },
      _sum: {
        duration: true,
      },
    },
  );
  // Get project details for each project
  const projectIdList = hoursByProjectRaw.map((r) => r.hrm_platform_project_id);
  const projects = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: {
      id: { in: projectIdList },
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      color_code: true,
    },
  });
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const hoursByProject = hoursByProjectRaw
    .map((r): IHrmPlatformEmployee.IWorkloadProjectHour | null => {
      const project = projectMap.get(r.hrm_platform_project_id);
      if (!project) return null;
      return {
        projectId: r.hrm_platform_project_id,
        projectName: project.name,
        colorCode: project.color_code ?? "",
        hoursLogged: (r._sum.duration ?? 0) / 60,
      };
    })
    .filter((x): x is IHrmPlatformEmployee.IWorkloadProjectHour => x !== null)
    .sort((a, b) => b.hoursLogged - a.hoursLogged);
  return {
    hoursThisWeek,
    hoursThisMonth,
    hoursAllTime,
    activeTimer: activeTimer !== null,
    activeTimerProjectId: activeTimer?.hrm_platform_project_id ?? null,
    activeTimerTaskId: activeTimer?.hrm_platform_task_id ?? null,
    activeTimerStartedAt: activeTimer?.started_at
      ? toISOStringSafe(activeTimer.started_at)
      : null,
    assignedTasksCount: assignedTasksCount,
    pendingTimesheetsCount: pendingTimesheetsCount,
    billableHours,
    nonBillableHours,
    hoursByProject,
  } satisfies IHrmPlatformEmployee.IWorkload;
}
