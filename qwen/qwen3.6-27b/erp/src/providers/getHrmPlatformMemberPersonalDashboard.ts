import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { IPersonalDashboardView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPersonalDashboardView";
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

export async function getHrmPlatformMemberPersonalDashboard(props: {
  member: MemberPayload;
}): Promise<IPersonalDashboardView> {
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_member_id: props.member.id,
    },
    select: { id: true },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - diffToMonday,
  );
  const nextMondayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - diffToMonday + 7,
  );
  const todayAgg = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
    where: {
      hrm_platform_employee_id: employee.id,
      date: { gte: todayStart, lt: tomorrowStart },
      deleted_at: null,
    },
    _sum: { duration_minutes: true },
  });
  const hoursToday =
    todayAgg._sum.duration_minutes !== null
      ? todayAgg._sum.duration_minutes / 60
      : 0;
  const weekAgg = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
    where: {
      hrm_platform_employee_id: employee.id,
      date: { gte: mondayStart, lt: nextMondayStart },
      deleted_at: null,
    },
    _sum: { duration_minutes: true },
  });
  const hoursThisWeek =
    weekAgg._sum.duration_minutes !== null
      ? weekAgg._sum.duration_minutes / 60
      : 0;
  const activeTimerRaw = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      hrm_platform_employees_id: employee.id,
      stopped_at: null,
      deleted_at: null,
    },
    ...HrmPlatformTimerAtSummaryTransformer.select(),
  });
  const recentTimelogsRaw =
    await MyGlobal.prisma.hrm_platform_timelogs.findMany({
      where: {
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      take: 5,
      ...HrmPlatformTimelogAtSummaryTransformer.select(),
    });
  const pendingTimesheetRaw =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        status: { in: ["draft", "submitted"] },
        deleted_at: null,
      },
      orderBy: { updated_at: "desc" },
      ...HrmPlatformTimesheetAtSummaryTransformer.select(),
    });
  const assignedTasksRaw = await MyGlobal.prisma.hrm_platform_tasks.findMany({
    where: {
      hrm_platform_employee_id: employee.id,
      status: { in: ["open", "in-progress"] },
      deleted_at: null,
    },
    take: 5,
    ...HrmPlatformTaskAtSummaryTransformer.select(),
  });
  return {
    hoursToday,
    hoursThisWeek,
    activeTimer:
      activeTimerRaw != null
        ? await HrmPlatformTimerAtSummaryTransformer.transform(activeTimerRaw)
        : null,
    recentTimelogs: await ArrayUtil.asyncMap(
      recentTimelogsRaw,
      HrmPlatformTimelogAtSummaryTransformer.transform,
    ),
    pendingTimesheet:
      pendingTimesheetRaw != null
        ? await HrmPlatformTimesheetAtSummaryTransformer.transform(
            pendingTimesheetRaw,
          )
        : null,
    assignedTasks:
      await HrmPlatformTaskAtSummaryTransformer.transformAll(assignedTasksRaw),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IPersonalDashboardView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPersonalDashboardView";
// import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
// import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberPersonalDashboard(props: {
//   member: MemberPayload;
// }): Promise<IPersonalDashboardView> {
//   return {
//     hoursToday: ...,
//     hoursThisWeek: ...,
//     activeTimer: await HrmPlatformTimerAtSummaryTransformer.transform(...),
//     recentTimelogs: await ArrayUtil.asyncMap(..., (r) => HrmPlatformTimelogAtSummaryTransformer.transform(r)),
//     pendingTimesheet: await HrmPlatformTimesheetAtSummaryTransformer.transform(...),
//     assignedTasks: await HrmPlatformTaskAtSummaryTransformer.transformAll(...),
//   };
// }
// ```
//--------------------------------------------------------------