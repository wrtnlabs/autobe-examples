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
}): Promise<IHrmPlatformDashboard.IPersonal> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekStart = new Date(todayStart);
  const dayOfWeek = weekStart.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(weekStart.getDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const todayAgg = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
    _sum: {
      duration_minutes: true,
    },
    where: {
      hrm_platform_employee_id: employee.id,
      date: {
        gte: todayStart,
        lt: todayEnd,
      },
      deleted_at: null,
    },
  });
  const weekAgg = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
    _sum: {
      duration_minutes: true,
    },
    where: {
      hrm_platform_employee_id: employee.id,
      date: {
        gte: weekStart,
        lt: weekEnd,
      },
      deleted_at: null,
    },
  });
  const hoursToday = (todayAgg._sum.duration_minutes ?? 0) / 60;
  const hoursThisWeek = (weekAgg._sum.duration_minutes ?? 0) / 60;
  const activeTimerRecord = await MyGlobal.prisma.hrm_platform_timers.findFirst(
    {
      where: {
        hrm_platform_employee_id: employee.id,
        stopped_at: null,
      },
      ...HrmPlatformTimerAtSummaryTransformer.select(),
    },
  );
  const activeTimer = activeTimerRecord
    ? await HrmPlatformTimerAtSummaryTransformer.transform(activeTimerRecord)
    : null;
  const recentTimelogsRecords =
    await MyGlobal.prisma.hrm_platform_timelogs.findMany({
      where: {
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 5,
      ...HrmPlatformTimelogAtSummaryTransformer.select(),
    });
  const recentTimelogs = await ArrayUtil.asyncMap(
    recentTimelogsRecords,
    HrmPlatformTimelogAtSummaryTransformer.transform,
  );
  const pendingTimesheetRecord =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        employee_id: employee.id,
        week_start_date: {
          gte: weekStart,
          lt: weekEnd,
        },
        status: {
          in: ["draft", "submitted"],
        },
        deleted_at: null,
      },
      ...HrmPlatformTimesheetAtSummaryTransformer.select(),
    });
  const pendingTimesheet = pendingTimesheetRecord
    ? await HrmPlatformTimesheetAtSummaryTransformer.transform(
        pendingTimesheetRecord,
      )
    : null;
  const assignedTasksRecords =
    await MyGlobal.prisma.hrm_platform_tasks.findMany({
      where: {
        assigned_employee_id: employee.id,
        status: {
          in: ["open", "in-progress"],
        },
        deleted_at: null,
      },
      orderBy: [
        {
          priority: "desc",
        },
        {
          due_date: "asc",
        },
      ],
      ...HrmPlatformTaskAtSummaryTransformer.select(),
    });
  const assignedTasks =
    await HrmPlatformTaskAtSummaryTransformer.transformAll(
      assignedTasksRecords,
    );
  return {
    hoursToday,
    hoursThisWeek,
    activeTimer,
    recentTimelogs,
    pendingTimesheet,
    assignedTasks,
  } satisfies IHrmPlatformDashboard.IPersonal;
}
