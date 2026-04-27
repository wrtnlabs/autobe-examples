import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboard";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingMemberAtSummaryTransformer } from "../transformers/HrmTimeTrackingMemberAtSummaryTransformer";
import { HrmTimeTrackingTaskAtSummaryTransformer } from "../transformers/HrmTimeTrackingTaskAtSummaryTransformer";
import { HrmTimeTrackingTimelogAtSummaryTransformer } from "../transformers/HrmTimeTrackingTimelogAtSummaryTransformer";
import { HrmTimeTrackingTimerAtSummaryTransformer } from "../transformers/HrmTimeTrackingTimerAtSummaryTransformer";
import { HrmTimeTrackingTimesheetAtSummaryTransformer } from "../transformers/HrmTimeTrackingTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingMemberDashboard(props: {
  member: MemberPayload;
}): Promise<IHrmTimeTrackingDashboard> {
  // ----
  // 1. Find the employee record for this authenticated member
  // ----
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_organization_id: true,
      hrm_time_tracking_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  const employeeId: string = employee.id;
  const organizationId: string = employee.hrm_time_tracking_organization_id;
  const roleId: string = employee.hrm_time_tracking_role_id;
  // ----
  // 2. Get organization timezone
  // ----
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: { id: organizationId },
      select: { timezone: true },
    });
  // ----
  // 3. Compute date boundaries — ALL strings, NO `Date` type, NO `as`
  // ----
  const { todayStart, todayEnd, weekStart, weekEnd } = getDateBoundaries(
    organization.timezone,
  );
  // ----
  // 4. Personal Dashboard: Today's hours
  // ----
  const todayAgg = await MyGlobal.prisma.hrm_time_tracking_timelogs.aggregate({
    _sum: { duration_minutes: true },
    where: {
      hrm_time_tracking_employee_id: employeeId,
      deleted_at: null,
      date: { gte: todayStart, lte: todayEnd },
    },
  });
  const todayHours: number = (todayAgg._sum.duration_minutes ?? 0) / 60;
  // ----
  // 5. Personal Dashboard: Week's hours
  // ----
  const weekAgg = await MyGlobal.prisma.hrm_time_tracking_timelogs.aggregate({
    _sum: { duration_minutes: true },
    where: {
      hrm_time_tracking_employee_id: employeeId,
      deleted_at: null,
      date: { gte: weekStart, lte: weekEnd },
    },
  });
  const weekHours: number = (weekAgg._sum.duration_minutes ?? 0) / 60;
  // ----
  // 6. Personal Dashboard: Active timer
  // ----
  const activeTimerRecord =
    await MyGlobal.prisma.hrm_time_tracking_timers.findFirst({
      where: {
        hrm_time_tracking_employee_id: employeeId,
        status: "running",
      },
      ...HrmTimeTrackingTimerAtSummaryTransformer.select(),
    });
  const activeTimer = activeTimerRecord
    ? await HrmTimeTrackingTimerAtSummaryTransformer.transform(
        activeTimerRecord,
      )
    : null;
  // ----
  // 7. Personal Dashboard: Recent 5 timelogs
  // ----
  const recentTimelogRecords =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
      where: {
        hrm_time_tracking_employee_id: employeeId,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      take: 5,
      ...HrmTimeTrackingTimelogAtSummaryTransformer.select(),
    });
  const recentTimelogs = await ArrayUtil.asyncMap(
    recentTimelogRecords,
    HrmTimeTrackingTimelogAtSummaryTransformer.transform,
  );
  // ----
  // 8. Personal Dashboard: Pending timesheet (current week)
  // ----
  const timesheetRecord =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst({
      where: {
        hrm_time_tracking_employee_id: employeeId,
        week_start_date: { equals: weekStart },
        deleted_at: null,
      },
      ...HrmTimeTrackingTimesheetAtSummaryTransformer.select(),
    });
  const pendingTimesheet = timesheetRecord
    ? await HrmTimeTrackingTimesheetAtSummaryTransformer.transform(
        timesheetRecord,
      )
    : null;
  // ----
  // 9. Personal Dashboard: Assigned tasks (open or in-progress)
  // ----
  const assignedTaskRecords =
    await MyGlobal.prisma.hrm_time_tracking_tasks.findMany({
      where: {
        hrm_time_tracking_employee_id: employeeId,
        status: { in: ["open", "in-progress"] },
        deleted_at: null,
      },
      ...HrmTimeTrackingTaskAtSummaryTransformer.select(),
    });
  const assignedTasks =
    await HrmTimeTrackingTaskAtSummaryTransformer.transformAll(
      assignedTaskRecords,
    );
  // ----
  // 10. Check report:view permission for this employee's role
  // ----
  const reportViewPermission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: roleId,
        permission_code: "report:view",
        deleted_at: null,
      },
    });
  // ----
  // 11. Organization Dashboard (conditional — only with report:view)
  // ----
  let organizationSection: IHrmTimeTrackingDashboard.IOrganization | undefined =
    undefined;
  if (reportViewPermission !== null) {
    // 11a. Total active employees count
    const totalActiveEmployees: number =
      await MyGlobal.prisma.hrm_time_tracking_employees.count({
        where: {
          hrm_time_tracking_organization_id: organizationId,
          status: "active",
          deleted_at: null,
        },
      });
    // 11b. Total week hours across ALL employees in the organization
    const totalWeekAgg =
      await MyGlobal.prisma.hrm_time_tracking_timelogs.aggregate({
        _sum: { duration_minutes: true },
        where: {
          deleted_at: null,
          date: { gte: weekStart, lte: weekEnd },
          employee: {
            hrm_time_tracking_organization_id: organizationId,
            deleted_at: null,
          },
        },
      });
    const totalWeekHours: number =
      (totalWeekAgg._sum.duration_minutes ?? 0) / 60;
    // 11c. Pending timesheet count (submitted, awaiting approval)
    const pendingTimesheetCount: number =
      await MyGlobal.prisma.hrm_time_tracking_timesheets.count({
        where: {
          status: "submitted",
          deleted_at: null,
          employee: {
            hrm_time_tracking_organization_id: organizationId,
            deleted_at: null,
          },
        },
      });
    // 11d. Budget alerts: active projects with non-null budget > 80% utilized
    const budgetProjectRecords =
      await MyGlobal.prisma.hrm_time_tracking_projects.findMany({
        where: {
          hrm_time_tracking_organization_id: organizationId,
          status: "active",
          budget_hours: { not: null },
          deleted_at: null,
        },
        select: {
          id: true,
          name: true,
          budget_hours: true,
        },
      });
    const budgetAlerts: IHrmTimeTrackingDashboard.IBudgetAlert[] = [];
    for (const project of budgetProjectRecords) {
      const hoursAgg =
        await MyGlobal.prisma.hrm_time_tracking_timelogs.aggregate({
          _sum: { duration_minutes: true },
          where: {
            hrm_time_tracking_project_id: project.id,
            deleted_at: null,
          },
        });
      const actualHours: number = (hoursAgg._sum.duration_minutes ?? 0) / 60;
      const budgetHours: number = project.budget_hours!;
      const utilizationPercentage: number = (actualHours / budgetHours) * 100;
      if (utilizationPercentage > 80) {
        budgetAlerts.push({
          project_name: project.name,
          budgeted_hours: budgetHours,
          actual_hours: actualHours,
          utilization_percentage: utilizationPercentage,
        } satisfies IHrmTimeTrackingDashboard.IBudgetAlert);
      }
    }
    budgetAlerts.sort(
      (a, b) => b.utilization_percentage - a.utilization_percentage,
    );
    // 11e. Top 5 employees by hours logged this week
    const topEmployeeAgg =
      await MyGlobal.prisma.hrm_time_tracking_timelogs.groupBy({
        by: ["hrm_time_tracking_employee_id"],
        _sum: { duration_minutes: true },
        where: {
          deleted_at: null,
          date: { gte: weekStart, lte: weekEnd },
          employee: {
            hrm_time_tracking_organization_id: organizationId,
            deleted_at: null,
          },
        },
        orderBy: {
          _sum: { duration_minutes: "desc" },
        },
        take: 5,
      });
    const topEmployees: IHrmTimeTrackingDashboard.ITopEmployee[] = [];
    for (const row of topEmployeeAgg) {
      const empRecord =
        await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
          where: { id: row.hrm_time_tracking_employee_id },
          select: {
            member: HrmTimeTrackingMemberAtSummaryTransformer.select(),
          },
        });
      topEmployees.push({
        member: await HrmTimeTrackingMemberAtSummaryTransformer.transform(
          empRecord.member,
        ),
        total_hours: (row._sum.duration_minutes ?? 0) / 60,
      } satisfies IHrmTimeTrackingDashboard.ITopEmployee);
    }
    organizationSection = {
      total_active_employees: totalActiveEmployees,
      total_week_hours: totalWeekHours,
      pending_timesheet_count: pendingTimesheetCount,
      budget_alerts: budgetAlerts,
      top_employees: topEmployees,
    } satisfies IHrmTimeTrackingDashboard.IOrganization;
  }
  // ----
  // 12. Build and return the dashboard response
  // ----
  return {
    today_hours: todayHours,
    week_hours: weekHours,
    active_timer: activeTimer,
    recent_timelogs: recentTimelogs,
    pending_timesheet: pendingTimesheet,
    assigned_tasks: assignedTasks,
    organization: organizationSection,
  } satisfies IHrmTimeTrackingDashboard;
}
// ============================================================
// Date boundary helpers — ZERO `Date` type, ZERO `as` assertions
// ============================================================
/**
 * Compute date boundaries for "today" and the current work week (Monday-Sunday)
 * in the specified IANA timezone.
 *
 * All return values are ISO 8601 UTC strings.
 * Uses `Date.now()` (returns `number`) and `Date.UTC()` (returns `number`)
 * for arithmetic. Converts to strings via pure integer math — no `new Date()`,
 * no `Date` type, no `as` assertions.
 */
function getDateBoundaries(timezone: string): {
  todayStart: string & tags.Format<"date-time">;
  todayEnd: string & tags.Format<"date-time">;
  weekStart: string & tags.Format<"date-time">;
  weekEnd: string & tags.Format<"date-time">;
} {
  const now: number = Date.now();
  // Get date components AND timezone offset in one formatter call
  const partsFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    timeZoneName: "shortOffset",
  });
  const parts: Intl.DateTimeFormatPart[] = partsFormatter.formatToParts(now);
  const partValue = (type: string): string =>
    parts.find((p) => p.type === type)!.value;
  const year: number = parseInt(partValue("year"), 10);
  const month: number = parseInt(partValue("month"), 10);
  const day: number = parseInt(partValue("day"), 10);
  const weekday: string = partValue("weekday");
  // Parse timezone offset from "GMT+09:00", "GMT-05:00", or "GMT" format
  const tzName: string = partValue("timeZoneName");
  const offsetMs: number = parseTimezoneOffsetMs(tzName);
  // Day-of-week map: Sun=0 .. Sat=6
  const dowMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek: number = dowMap[weekday] ?? 0;
  // UTC epoch for calendar-date UTC midnight (YYYY-MM-DDT00:00:00.000Z)
  const utcMidnightEpoch: number = Date.UTC(year, month - 1, day);
  // Local midnight in UTC epoch: UTC midnight minus the offset
  // For UTC+9 (Seoul): midnight Seoul = UTC 15:00 previous day = utcMidnightEpoch - 9h
  // For UTC-5 (NY): midnight NY = UTC 05:00 same day = utcMidnightEpoch + 5h
  const localMidnightEpoch: number = utcMidnightEpoch - offsetMs;
  const dayMs: number = 86400000;
  // Days to Monday (start of week): if Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1)
  const daysToMonday: number = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  // Days to Sunday (end of week): if Sunday (0), 0; otherwise 7 - dayOfWeek
  const daysToSunday: number = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const mondayMidnightEpoch: number = localMidnightEpoch - daysToMonday * dayMs;
  const sundayEndEpoch: number =
    localMidnightEpoch + daysToSunday * dayMs + dayMs - 1;
  const todayStart: string & tags.Format<"date-time"> =
    epochToDateTimeString(localMidnightEpoch);
  const todayEnd: string & tags.Format<"date-time"> = epochToDateTimeString(
    localMidnightEpoch + dayMs - 1,
  );
  const weekStart: string & tags.Format<"date-time"> =
    epochToDateTimeString(mondayMidnightEpoch);
  const weekEnd: string & tags.Format<"date-time"> =
    epochToDateTimeString(sundayEndEpoch);
  return { todayStart, todayEnd, weekStart, weekEnd };
}
/**
 * Parse a timezone name string like "GMT+09:00", "GMT-05:00", or "GMT"
 * into a numeric offset in milliseconds.
 *
 * The offset is defined as: offset = UTC - localtime
 * So for UTC+9 (Seoul): local = UTC + 9 → UTC - local = -9h → offsetMs = -32400000
 * For UTC-5 (NY EST): local = UTC - 5 → UTC - local = +5h → offsetMs = +18000000
 */
function parseTimezoneOffsetMs(tzName: string): number {
  const match: RegExpMatchArray | null = tzName.match(
    /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/,
  );
  if (match === null) {
    // "GMT" with no offset means UTC
    return 0;
  }
  const sign: string = match[1];
  const hours: number = parseInt(match[2], 10);
  const minutes: number = match[3] ? parseInt(match[3], 10) : 0;
  const totalMinutes: number = hours * 60 + minutes;
  // Negate: "GMT+09:00" means local = UTC + 9h → UTC - local = -9h
  const multiplier: number = sign === "+" ? -1 : 1;
  return multiplier * totalMinutes * 60 * 1000;
}
/**
 * Convert a UTC epoch millisecond timestamp to an ISO 8601 datetime string
 * using pure integer math — NO `Date` type, NO `as` assertion.
 *
 * Uses `typia.assert<T>()` for type narrowing instead of `as`.
 */
function epochToDateTimeString(
  epochMs: number,
): string & tags.Format<"date-time"> {
  const totalSeconds: number = Math.floor(epochMs / 1000);
  const msPart: number = Math.abs(epochMs - totalSeconds * 1000);
  let days: number = Math.floor(totalSeconds / 86400);
  const timeSeconds: number = Math.abs(totalSeconds % 86400);
  const hours: number = Math.floor(timeSeconds / 3600);
  const minutes: number = Math.floor((timeSeconds % 3600) / 60);
  const seconds: number = timeSeconds % 60;
  // Compute year/month/day from days since Unix epoch (1970-01-01)
  let year: number = 1970;
  while (true) {
    const diy: number = isLeapYear(year) ? 366 : 365;
    if (days < diy) {
      break;
    }
    days -= diy;
    year++;
  }
  const monthDays: number[] = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let month: number = 0;
  while (month < 12 && days >= monthDays[month]) {
    days -= monthDays[month];
    month++;
  }
  const dayOfMonth: number = days + 1;
  const pad2 = (n: number): string => String(Math.floor(n)).padStart(2, "0");
  const pad4 = (n: number): string => String(Math.floor(n)).padStart(4, "0");
  const pad3 = (n: number): string => String(Math.floor(n)).padStart(3, "0");
  const isoString: string = `${pad4(year)}-${pad2(month + 1)}-${pad2(dayOfMonth)}T${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${pad3(msPart)}Z`;
  return typia.assert<string & tags.Format<"date-time">>(isoString);
}
/**
 * Determine whether a given year is a leap year in the Gregorian calendar.
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
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
// import { IHrmTimeTrackingDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboard";
// import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
// import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
// import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmTimeTrackingMemberDashboard(props: {
//   member: MemberPayload;
// }): Promise<IHrmTimeTrackingDashboard> {
//   return {
//     today_hours: ...,
//     week_hours: ...,
//     active_timer: await HrmTimeTrackingTimerAtSummaryTransformer.transform(...),
//     recent_timelogs: await ArrayUtil.asyncMap(..., (r) => HrmTimeTrackingTimelogAtSummaryTransformer.transform(r)),
//     pending_timesheet: await HrmTimeTrackingTimesheetAtSummaryTransformer.transform(...),
//     assigned_tasks: await HrmTimeTrackingTaskAtSummaryTransformer.transformAll(...),
//     organization: ...,
//   };
// }
// ```
//--------------------------------------------------------------