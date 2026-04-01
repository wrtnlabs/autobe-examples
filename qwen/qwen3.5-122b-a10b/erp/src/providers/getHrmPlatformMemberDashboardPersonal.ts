import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
import { HrmPlatformTimelogAtSummaryTransformer } from "../transformers/HrmPlatformTimelogAtSummaryTransformer";
import { HrmPlatformTimerAtSummaryTransformer } from "../transformers/HrmPlatformTimerAtSummaryTransformer";
import { HrmPlatformTimesheetAtSummaryTransformer } from "../transformers/HrmPlatformTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberDashboardPersonal(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformPersonalDashboard> {
  // 1) Resolve current employee from authentication context
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_user_id: props.member.id,
        deleted_at: null,
      },
    });
  // 2) Calculate hours logged today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const timelogsToday = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
    where: {
      hrm_platform_employee_id: employee.id,
      date: {
        gte: today,
        lt: tomorrow,
      },
      deleted_at: null,
    },
    _sum: {
      duration_minutes: true,
    },
  });
  const hoursLoggedToday = (timelogsToday._sum.duration_minutes ?? 0) / 60;
  // 3) Calculate hours logged this week (Monday to Sunday)
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const sundayOffset = mondayOffset + 6;
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + sundayOffset);
  weekEnd.setHours(23, 59, 59, 999);
  const timelogsThisWeek =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        hrm_platform_employee_id: employee.id,
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
  const hoursLoggedThisWeek =
    (timelogsThisWeek._sum.duration_minutes ?? 0) / 60;
  // 4) Retrieve active timer
  const activeTimerRaw = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      employee_id: employee.id,
      stopped_at: null,
      deleted_at: null,
    },
    ...HrmPlatformTimerAtSummaryTransformer.select(),
  });
  const activeTimer: IHrmPlatformTimer.ISummary | null = activeTimerRaw
    ? await HrmPlatformTimerAtSummaryTransformer.transform(activeTimerRaw)
    : null;
  // 5) Get recent timelogs (last 7 days)
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentTimelogsRaw =
    await MyGlobal.prisma.hrm_platform_timelogs.findMany({
      where: {
        hrm_platform_employee_id: employee.id,
        date: {
          gte: sevenDaysAgo,
        },
        deleted_at: null,
      },
      orderBy: { date: "desc" },
      take: 10,
      ...HrmPlatformTimelogAtSummaryTransformer.select(),
    });
  const recentTimelogs = await ArrayUtil.asyncMap(
    recentTimelogsRaw,
    HrmPlatformTimelogAtSummaryTransformer.transform,
  );
  // 6) Check for pending timesheets
  const pendingTimesheetRaw =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        status: { in: ["draft", "submitted"] },
        deleted_at: null,
      },
      orderBy: { week_start_date: "desc" },
      ...HrmPlatformTimesheetAtSummaryTransformer.select(),
    });
  const pendingTimesheet: IHrmPlatformTimesheet.ISummary | null =
    pendingTimesheetRaw
      ? await HrmPlatformTimesheetAtSummaryTransformer.transform(
          pendingTimesheetRaw,
        )
      : null;
  // 7) Retrieve assigned tasks
  const assignedTasksRaw = await MyGlobal.prisma.hrm_platform_tasks.findMany({
    where: {
      hrm_platform_employees_id: employee.id,
      status: { notIn: ["completed", "closed"] },
      deleted_at: null,
    },
    ...HrmPlatformTaskAtSummaryTransformer.select(),
  });
  const assignedTasks = await ArrayUtil.asyncMap(
    assignedTasksRaw,
    HrmPlatformTaskAtSummaryTransformer.transform,
  );
  return {
    hoursLoggedToday,
    hoursLoggedThisWeek,
    activeTimer,
    recentTimelogs,
    pendingTimesheet,
    assignedTasks,
  };
}
