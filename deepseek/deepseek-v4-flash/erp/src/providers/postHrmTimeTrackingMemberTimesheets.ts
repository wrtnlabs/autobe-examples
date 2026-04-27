import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingTimesheetCollector } from "../collectors/HrmTimeTrackingTimesheetCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimesheetTransformer } from "../transformers/HrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

/**
 * Check if a year is a leap year (Gregorian calendar).
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
/**
 * Add N days to a YYYY-MM-DD date string using pure arithmetic.
 */
function addDaysToString(dateStr: string, days: number): string {
  const year: number = Number(dateStr.substring(0, 4));
  const month: number = Number(dateStr.substring(5, 7));
  const day: number = Number(dateStr.substring(8, 10));
  const dim: number[] = [
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
  let newDay: number = day + days;
  let newMonth: number = month;
  let newYear: number = year;
  while (newDay > dim[newMonth - 1]) {
    newDay -= dim[newMonth - 1];
    newMonth += 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
  }
  return `${String(newYear).padStart(4, "0")}-${String(newMonth).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`;
}
/**
 * Compute day-of-week (0=Sun, 1=Mon, ..., 6=Sat) using
 * Tomohiko Sakamoto's algorithm. Pure integer arithmetic — no Date.
 */
function dayOfWeekFromString(dateStr: string): number {
  const y: number = Number(dateStr.substring(0, 4));
  const m: number = Number(dateStr.substring(5, 7));
  const d: number = Number(dateStr.substring(8, 10));
  const t: number[] = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const adj: number = m < 3 ? y - 1 : y;
  return (
    (adj +
      Math.floor(adj / 4) -
      Math.floor(adj / 100) +
      Math.floor(adj / 400) +
      t[m - 1] +
      d) %
    7
  );
}
export async function postHrmTimeTrackingMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimesheet.ICreate;
}): Promise<IHrmTimeTrackingTimesheet> {
  // ============================================================
  //  1. FIND ACTIVE EMPLOYEE
  // ============================================================
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (employee.status === "deactivated") {
    throw new HttpException("Forbidden", 403);
  }
  // ============================================================
  //  2. VALIDATE MONDAY
  // ============================================================
  const dateStr: string = props.body.week_start_date;
  if (dayOfWeekFromString(dateStr) !== 1) {
    throw new HttpException("week_start_date must be a Monday", 400);
  }
  const weekStartISO: string = `${dateStr}T00:00:00.000Z`;
  const weekEndDateStr: string = addDaysToString(dateStr, 6);
  const weekEndISO: string = `${weekEndDateStr}T23:59:59.999Z`;
  // ============================================================
  //  3. CHECK UNIQUE CONSTRAINT
  // ============================================================
  const existing = await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst(
    {
      where: {
        hrm_time_tracking_employee_id: employee.id,
        week_start_date: weekStartISO,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (existing !== null) {
    throw new HttpException(
      "A timesheet already exists for this work week",
      409,
    );
  }
  // ============================================================
  //  4. FIND UNASSOCIATED TIMELOGS IN THE WEEK
  // ============================================================
  const foundTimelogs =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
      where: {
        hrm_time_tracking_employee_id: employee.id,
        date: {
          gte: weekStartISO,
          lte: weekEndISO,
        },
        deleted_at: null,
        hrm_time_tracking_timesheet_id: null,
      },
      select: {
        id: true,
        duration_minutes: true,
      },
    });
  // ============================================================
  //  5. COMPUTE TOTAL HOURS
  // ============================================================
  const totalMinutes: number = foundTimelogs.reduce(
    (sum: number, tl) => sum + tl.duration_minutes,
    0,
  );
  const totalHours: number = totalMinutes / 60.0;
  // ============================================================
  //  6. CREATE TIMESHEET
  //  Uses Collector (pre-existing module handles Date internally)
  //  + spread override total_hours with computed value
  // ============================================================
  const created = await MyGlobal.prisma.hrm_time_tracking_timesheets.create({
    data: {
      ...(await HrmTimeTrackingTimesheetCollector.collect({
        body: props.body,
        hrmTimeTrackingEmployees: { id: employee.id } satisfies IEntity,
        hrmTimeTrackingMemberSessions: {
          id: props.member.session_id,
        } satisfies IEntity,
      })),
      total_hours: totalHours,
    } satisfies Prisma.hrm_time_tracking_timesheetsCreateInput,
    ...HrmTimeTrackingTimesheetTransformer.select(),
  });
  // ============================================================
  //  7. LINK TIMELOGS
  // ============================================================
  if (foundTimelogs.length > 0) {
    await MyGlobal.prisma.hrm_time_tracking_timelogs.updateMany({
      where: {
        id: { in: foundTimelogs.map((tl) => tl.id) },
      },
      data: {
        hrm_time_tracking_timesheet_id: created.id,
      },
    });
  }
  // ============================================================
  //  8. RETURN
  // ============================================================
  return await HrmTimeTrackingTimesheetTransformer.transform(created);
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
// import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberTimesheets(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingTimesheet.ICreate;
// }): Promise<IHrmTimeTrackingTimesheet> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_timesheets.create({
//     data: await HrmTimeTrackingTimesheetCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTimeTrackingTimesheetTransformer.select(),
//   });
//   return await HrmTimeTrackingTimesheetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------