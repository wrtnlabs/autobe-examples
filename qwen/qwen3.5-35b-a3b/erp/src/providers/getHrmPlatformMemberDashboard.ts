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
import { HrmPlatformProjectAtSummaryTransformer } from "../transformers/HrmPlatformProjectAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "../transformers/HrmPlatformTaskAtSummaryTransformer";
import { HrmPlatformTimelogAtSummaryTransformer } from "../transformers/HrmPlatformTimelogAtSummaryTransformer";
import { HrmPlatformTimerAtSummaryTransformer } from "../transformers/HrmPlatformTimerAtSummaryTransformer";
import { HrmPlatformTimesheetAtSummaryTransformer } from "../transformers/HrmPlatformTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberDashboard(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformDashboard> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_organization_id: true,
      },
    });
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  const dayOfWeek = todayStart.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(weekStart.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const todayTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      employee_id: employee.id,
      deleted_at: null,
      start_datetime: { gte: todayStart },
    },
    select: { duration_minutes: true },
  });
  const totalMinutesToday = todayTimelogs.reduce(
    (sum, t) => sum + t.duration_minutes,
    0,
  );
  const hoursLoggedToday = Math.round((totalMinutesToday / 60) * 100) / 100;
  const weekTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      employee_id: employee.id,
      deleted_at: null,
      start_datetime: { gte: weekStart, lte: weekEnd },
    },
    select: { duration_minutes: true },
  });
  const totalMinutesWeek = weekTimelogs.reduce(
    (sum, t) => sum + t.duration_minutes,
    0,
  );
  const hoursLoggedThisWeek = Math.round((totalMinutesWeek / 60) * 100) / 100;
  const activeTimerRecord = await MyGlobal.prisma.hrm_platform_timers.findFirst(
    {
      where: {
        hrm_platform_employee_id: employee.id,
        status: "started",
        deleted_at: null,
      },
      include: {
        project: {
          select: HrmPlatformProjectAtSummaryTransformer.select().select,
        },
        task: { select: HrmPlatformTaskAtSummaryTransformer.select().select },
      },
    },
  );
  const activeTimerSummary = activeTimerRecord
    ? await HrmPlatformTimerAtSummaryTransformer.transform({
        ...activeTimerRecord,
        project: activeTimerRecord.project,
        task: activeTimerRecord.task,
      })
    : null;
  const recentTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: { employee_id: employee.id, deleted_at: null },
    orderBy: { created_at: "desc" },
    take: 5,
    select: HrmPlatformTimelogAtSummaryTransformer.select().select,
  });
  const recentTimelogsSummary = await ArrayUtil.asyncMap(
    recentTimelogs,
    async (t) => await HrmPlatformTimelogAtSummaryTransformer.transform(t),
  );
  const pendingTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
        start_date: { gte: weekStart, lte: weekEnd },
      },
      select: HrmPlatformTimesheetAtSummaryTransformer.select().select,
    });
  const pendingTimesheetSummary = pendingTimesheet
    ? await HrmPlatformTimesheetAtSummaryTransformer.transform(pendingTimesheet)
    : null;
  const assignedTasks = await MyGlobal.prisma.hrm_platform_tasks.findMany({
    where: {
      assigned_employee_id: employee.id,
      status: { in: ["TODO", "IN_PROGRESS"] },
      deleted_at: null,
    },
    select: HrmPlatformTaskAtSummaryTransformer.select().select,
  });
  const assignedTasksSummary =
    await HrmPlatformTaskAtSummaryTransformer.transformAll(assignedTasks);
  return {
    hoursLoggedToday,
    hoursLoggedThisWeek,
    activeTimer: activeTimerSummary,
    recentTimelogs: recentTimelogsSummary,
    pendingTimesheet: pendingTimesheetSummary,
    assignedTasks: assignedTasksSummary,
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
// import { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
// import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
// import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberDashboard(props: {
//   member: MemberPayload;
// }): Promise<IHrmPlatformDashboard> {
//   return {
//     hoursLoggedToday: ...,
//     hoursLoggedThisWeek: ...,
//     activeTimer: await HrmPlatformTimerAtSummaryTransformer.transform(...),
//     recentTimelogs: await ArrayUtil.asyncMap(..., (r) => HrmPlatformTimelogAtSummaryTransformer.transform(r)),
//     pendingTimesheet: await HrmPlatformTimesheetAtSummaryTransformer.transform(...),
//     assignedTasks: await HrmPlatformTaskAtSummaryTransformer.transformAll(...),
//   };
// }
// ```
//--------------------------------------------------------------