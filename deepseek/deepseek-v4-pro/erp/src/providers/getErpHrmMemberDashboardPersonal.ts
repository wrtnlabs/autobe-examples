import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmPersonalDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPersonalDashboard";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskAtSummaryTransformer } from "../transformers/ErpHrmTaskAtSummaryTransformer";
import { ErpHrmTimelogAtSummaryTransformer } from "../transformers/ErpHrmTimelogAtSummaryTransformer";
import { ErpHrmTimerTransformer } from "../transformers/ErpHrmTimerTransformer";
import { ErpHrmTimesheetAtSummaryTransformer } from "../transformers/ErpHrmTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberDashboardPersonal(props: {
  member: MemberPayload;
}): Promise<IErpHrmPersonalDashboard> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findFirstOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization selected", 400);
  }
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: { id: true, status: true },
  });
  if (employee.status !== "active") {
    throw new HttpException("Employee is deactivated", 403);
  }
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const nowMs: number = Date.now();
  const kstNowMs: number = nowMs + KST_OFFSET_MS;
  const kstDays: number = Math.floor(kstNowMs / MS_PER_DAY);
  const todayStartMs: number = kstDays * MS_PER_DAY - KST_OFFSET_MS;
  const todayEndMs: number = todayStartMs + MS_PER_DAY;
  const kstDayOfWeek: number = (Math.floor(kstNowMs / MS_PER_DAY) + 4) % 7;
  const daysFromMonday: number = kstDayOfWeek === 0 ? 6 : kstDayOfWeek - 1;
  const weekStartMs: number = todayStartMs - daysFromMonday * MS_PER_DAY;
  const weekEndMs: number = weekStartMs + 7 * MS_PER_DAY;
  const toIso = (ms: number): string => new Date(ms).toISOString();
  const todayStart: string = toIso(todayStartMs);
  const todayEnd: string = toIso(todayEndMs);
  const weekStart: string = toIso(weekStartMs);
  const weekEnd: string = toIso(weekEndMs);
  const [
    todayAggregate,
    weekAggregate,
    timer,
    recentTimelogs,
    pendingTimesheet,
    assignedTasksRaw,
  ] = await Promise.all([
    MyGlobal.prisma.erp_hrm_timelogs.aggregate({
      where: {
        employee_id: employee.id,
        date: { gte: todayStart, lt: todayEnd },
        deleted_at: null,
      },
      _sum: { duration_minutes: true },
    }),
    MyGlobal.prisma.erp_hrm_timelogs.aggregate({
      where: {
        employee_id: employee.id,
        date: { gte: weekStart, lt: weekEnd },
        deleted_at: null,
      },
      _sum: { duration_minutes: true },
    }),
    MyGlobal.prisma.erp_hrm_timers.findUnique({
      where: { erp_hrm_employee_id: employee.id },
      ...ErpHrmTimerTransformer.select(),
    }),
    MyGlobal.prisma.erp_hrm_timelogs.findMany({
      where: {
        employee_id: employee.id,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      take: 5,
      ...ErpHrmTimelogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.erp_hrm_timesheets.findUnique({
      where: {
        employee_id_week_start_date: {
          employee_id: employee.id,
          week_start_date: weekStart,
        },
      },
      ...ErpHrmTimesheetAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.erp_hrm_tasks.findMany({
      where: {
        erp_hrm_assigned_employee_id: employee.id,
        status: { in: ["open", "in-progress"] },
        deleted_at: null,
      },
      ...ErpHrmTaskAtSummaryTransformer.select(),
    }),
  ]);
  const hoursTodayMinutes: number = todayAggregate._sum.duration_minutes ?? 0;
  const hoursWeekMinutes: number = weekAggregate._sum.duration_minutes ?? 0;
  const priorityOrder: Record<string, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  assignedTasksRaw.sort((a, b) => {
    const pa: number = priorityOrder[a.priority] ?? 99;
    const pb: number = priorityOrder[b.priority] ?? 99;
    if (pa !== pb) {
      return pa - pb;
    }
    if (a.due_date === null && b.due_date === null) {
      return 0;
    }
    if (a.due_date === null) {
      return 1;
    }
    if (b.due_date === null) {
      return -1;
    }
    return a.due_date.getTime() - b.due_date.getTime();
  });
  return {
    hours_today_minutes: hoursTodayMinutes,
    hours_today_decimal_hours: hoursTodayMinutes / 60,
    hours_this_week_minutes: hoursWeekMinutes,
    hours_this_week_decimal_hours: hoursWeekMinutes / 60,
    active_timer: timer ? await ErpHrmTimerTransformer.transform(timer) : null,
    recent_timelogs: await ArrayUtil.asyncMap(recentTimelogs, (r) =>
      ErpHrmTimelogAtSummaryTransformer.transform(r),
    ),
    pending_timesheet: pendingTimesheet
      ? await ErpHrmTimesheetAtSummaryTransformer.transform(pendingTimesheet)
      : null,
    assigned_tasks:
      await ErpHrmTaskAtSummaryTransformer.transformAll(assignedTasksRaw),
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
// import { IErpHrmPersonalDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPersonalDashboard";
// import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmMemberDashboardPersonal(props: {
//   member: MemberPayload;
// }): Promise<IErpHrmPersonalDashboard> {
//   return {
//     hours_today_minutes: ...,
//     hours_today_decimal_hours: ...,
//     hours_this_week_minutes: ...,
//     hours_this_week_decimal_hours: ...,
//     active_timer: await ErpHrmTimerTransformer.transform(...),
//     recent_timelogs: await ArrayUtil.asyncMap(..., (r) => ErpHrmTimelogAtSummaryTransformer.transform(r)),
//     pending_timesheet: await ErpHrmTimesheetAtSummaryTransformer.transform(...),
//     assigned_tasks: await ErpHrmTaskAtSummaryTransformer.transformAll(...),
//   };
// }
// ```
//--------------------------------------------------------------