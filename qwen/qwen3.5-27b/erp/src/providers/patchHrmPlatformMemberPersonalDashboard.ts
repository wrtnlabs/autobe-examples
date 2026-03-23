import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformPersonalDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPersonalDashboard";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTaskAtSummaryTransformer } from "../transformers/HrmPlatformTaskAtSummaryTransformer";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { HrmPlatformTimerAtSummaryTransformer } from "../transformers/HrmPlatformTimerAtSummaryTransformer";
import { HrmPlatformTimesheetAtSummaryTransformer } from "../transformers/HrmPlatformTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberPersonalDashboard(props: {
  member: MemberPayload;
  body: IHrmPlatformPersonalDashboard.IRequest;
}): Promise<IHrmPlatformPersonalDashboard> {
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  if (session.hrm_platform_organization_id === null) {
    throw new HttpException("No organization context", 400);
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: session.hrm_platform_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found in organization", 404);
  }
  if (employee.status !== "active") {
    throw new HttpException("Employee is deactivated", 403);
  }
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayStart.getDate() + 1);
  const weekStart = new Date(todayStart);
  const dayOfWeek = todayStart.getDay();
  const monday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(todayStart.getDate() + monday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(todayStart.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const recentTimelogsLimit = props.body.recentTimelogsLimit ?? 10;
  const pendingTimesheetsLimit = props.body.pendingTimesheetsLimit ?? 10;
  const assignedTasksLimit = props.body.assignedTasksLimit ?? 10;
  const hoursWorkedTodayResult =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        hrm_platform_employee_id: employee.id,
        date: {
          gte: todayStart,
          lt: todayEnd,
        },
        deleted_at: null,
      },
      _sum: {
        duration: true,
      },
    });
  const hoursWorkedToday = hoursWorkedTodayResult._sum.duration
    ? Math.round((hoursWorkedTodayResult._sum.duration / 60) * 100) / 100
    : 0;
  const hoursWorkedThisWeekResult =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        hrm_platform_employee_id: employee.id,
        date: {
          gte: weekStart,
          lt: weekEnd,
        },
        deleted_at: null,
      },
      _sum: {
        duration: true,
      },
    });
  const hoursWorkedThisWeek = hoursWorkedThisWeekResult._sum.duration
    ? Math.round((hoursWorkedThisWeekResult._sum.duration / 60) * 100) / 100
    : 0;
  const activeTimer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      hrm_platform_employee_id: employee.id,
      stopped_at: null,
      deleted_at: null,
    },
    ...HrmPlatformTimerAtSummaryTransformer.select(),
  });
  const recentTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      hrm_platform_employee_id: employee.id,
      date: {
        gte: sevenDaysAgo,
        lte: todayEnd,
      },
      deleted_at: null,
    },
    orderBy: {
      date: "desc",
    },
    take: recentTimelogsLimit,
    ...HrmPlatformTimelogTransformer.select(),
  });
  const pendingTimesheets =
    await MyGlobal.prisma.hrm_platform_timesheets.findMany({
      where: {
        hrm_platform_employee_id: employee.id,
        status: "submitted",
        deleted_at: null,
      },
      orderBy: {
        submitted_at: "desc",
      },
      take: pendingTimesheetsLimit,
      ...HrmPlatformTimesheetAtSummaryTransformer.select(),
    });
  const projectMemberships =
    await MyGlobal.prisma.hrm_platform_project_memberships.findMany({
      where: {
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        hrm_platform_project_id: true,
      },
    });
  const assignedTasks =
    projectMemberships.length > 0
      ? await MyGlobal.prisma.hrm_platform_tasks.findMany({
          where: {
            assigned_employee_id: employee.id,
            hrm_platform_project_id: {
              in: projectMemberships.map((pm) => pm.hrm_platform_project_id),
            },
            deleted_at: null,
          },
          orderBy: [
            {
              due_date: {
                sort: "asc",
                nulls: "last",
              },
            },
            {
              priority: "desc",
            },
          ],
          take: assignedTasksLimit,
          ...HrmPlatformTaskAtSummaryTransformer.select(),
        })
      : [];
  return {
    hoursWorkedToday,
    hoursWorkedThisWeek,
    activeTimer: activeTimer
      ? await HrmPlatformTimerAtSummaryTransformer.transform(activeTimer)
      : null,
    recentTimelogs: await ArrayUtil.asyncMap(
      recentTimelogs,
      HrmPlatformTimelogTransformer.transform,
    ),
    pendingTimesheets: await ArrayUtil.asyncMap(
      pendingTimesheets,
      HrmPlatformTimesheetAtSummaryTransformer.transform,
    ),
    assignedTasks: await ArrayUtil.asyncMap(
      assignedTasks,
      HrmPlatformTaskAtSummaryTransformer.transform,
    ),
  };
}
