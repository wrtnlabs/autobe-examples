import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
import { HrmPlatformTimelogAtSummaryTransformer } from "../transformers/HrmPlatformTimelogAtSummaryTransformer";
import { HrmPlatformTimerAtSummaryTransformer } from "../transformers/HrmPlatformTimerAtSummaryTransformer";
import { HrmPlatformTimesheetAtSummaryTransformer } from "../transformers/HrmPlatformTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberDashboardPersonal(props: {
  member: MemberPayload;
  body: IHrmPlatformDashboard.IRequest;
}): Promise<IHrmPlatformDashboard> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  const now = new Date();
  const seoulOffset = 9 * 60 * 60 * 1000;
  const seoulNow = new Date(now.getTime() + seoulOffset);
  const todayStart =
    new Date(
      Date.UTC(
        seoulNow.getUTCFullYear(),
        seoulNow.getUTCMonth(),
        seoulNow.getUTCDate(),
      ),
    ).getTime() - seoulOffset;
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
  const dayOfWeek = seoulNow.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart =
    new Date(
      Date.UTC(
        seoulNow.getUTCFullYear(),
        seoulNow.getUTCMonth(),
        seoulNow.getUTCDate(),
      ),
    ).getTime() +
    mondayOffset * 24 * 60 * 60 * 1000 -
    seoulOffset;
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000 - 1;
  const sections = props.body.sections ?? [];
  const includeAll = sections.length === 0;
  const timelogsLimit = Math.min(props.body.timelogsLimit ?? 5, 20);
  const tasksLimit = Math.min(props.body.tasksLimit ?? 10, 50);
  const shouldInclude = (section: keyof IHrmPlatformDashboard) =>
    includeAll || sections.includes(section);
  let hoursToday = 0;
  let hoursThisWeek = 0;
  let activeTimer: IHrmPlatformTimer.ISummary | null = null;
  let recentTimelogs: IHrmPlatformTimelog.ISummary[] = [];
  let pendingTimesheet: IHrmPlatformTimesheet.ISummary | null = null;
  let assignedTasks: IHrmPlatformTask.ISummary[] = [];
  if (shouldInclude("hoursToday")) {
    const hoursTodayResult =
      await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
        _sum: {
          duration_minutes: true,
        },
        where: {
          employee_id: employee.id,
          date: {
            gte: new Date(todayStart),
            lte: new Date(todayEnd),
          },
          deleted_at: null,
          project: {
            deleted_at: null,
          },
        },
      });
    hoursToday = (hoursTodayResult._sum.duration_minutes ?? 0) / 60;
  }
  if (shouldInclude("hoursThisWeek")) {
    const hoursThisWeekResult =
      await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
        _sum: {
          duration_minutes: true,
        },
        where: {
          employee_id: employee.id,
          date: {
            gte: new Date(weekStart),
            lte: new Date(weekEnd),
          },
          deleted_at: null,
          project: {
            deleted_at: null,
          },
        },
      });
    hoursThisWeek = (hoursThisWeekResult._sum.duration_minutes ?? 0) / 60;
  }
  if (shouldInclude("activeTimer")) {
    const timer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
      where: {
        employee_id: employee.id,
        stopped_at: null,
        deleted_at: null,
      },
      ...HrmPlatformTimerAtSummaryTransformer.select(),
    });
    if (timer) {
      activeTimer = await HrmPlatformTimerAtSummaryTransformer.transform(timer);
    }
  }
  if (shouldInclude("recentTimelogs")) {
    const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
      where: {
        employee_id: employee.id,
        deleted_at: null,
        project: {
          deleted_at: null,
        },
      },
      orderBy: [{ date: "desc" }, { created_at: "desc" }],
      take: timelogsLimit,
      ...HrmPlatformTimelogAtSummaryTransformer.select(),
    });
    recentTimelogs = await ArrayUtil.asyncMap(
      timelogs,
      HrmPlatformTimelogAtSummaryTransformer.transform,
    );
  }
  if (shouldInclude("pendingTimesheet")) {
    const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        employee_id: employee.id,
        week_start_date: new Date(weekStart),
        deleted_at: null,
      },
      ...HrmPlatformTimesheetAtSummaryTransformer.select(),
    });
    if (timesheet) {
      pendingTimesheet =
        await HrmPlatformTimesheetAtSummaryTransformer.transform(timesheet);
    }
  }
  if (shouldInclude("assignedTasks")) {
    const tasks = await MyGlobal.prisma.hrm_platform_tasks.findMany({
      where: {
        hrm_platform_employee_id: employee.id,
        status: {
          in: ["open", "in-progress"],
        },
        deleted_at: null,
      },
      orderBy: [{ due_date: "asc" }, { priority: "desc" }],
      take: tasksLimit,
      ...HrmPlatformTaskAtSummaryTransformer.select(),
    });
    assignedTasks = await ArrayUtil.asyncMap(
      tasks,
      HrmPlatformTaskAtSummaryTransformer.transform,
    );
  }
  return {
    hoursToday,
    hoursThisWeek,
    activeTimer,
    recentTimelogs,
    pendingTimesheet,
    assignedTasks,
  };
}
