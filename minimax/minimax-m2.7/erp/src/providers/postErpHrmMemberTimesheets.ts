import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimesheet.ICreate;
}): Promise<IErpHrmTimesheet> {
  // 1. Find employee by member session - get employee linked to this member
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found or not active", 404);
  }
  // 2. Validate weekStartDate is Monday using ISO string parsing
  const weekStartDateStr = props.body.weekStartDate;
  // Parse date components from ISO string: "YYYY-MM-DDTHH:mm:ss.sssZ"
  const datePart = weekStartDateStr.substring(0, 10);
  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // JS months are 0-indexed
  const day = Number(dayStr);
  // Calculate day of week using Zeller's congruence (works for any date)
  // For UTC dates, we use the Gregorian calendar formula
  const a = Math.floor((14 - (month + 1)) / 12);
  const y = year + 4800 - a;
  const m = month + 1 + 12 * a - 3;
  // Julian Day Number
  let jdn =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  // Day of week: 0 = Monday, 6 = Sunday
  const dayOfWeek = (jdn + 1) % 7;
  if (dayOfWeek !== 1) {
    throw new HttpException("weekStartDate must be a Monday", 400);
  }
  // 3. Calculate weekEndDate (Sunday = weekStartDate + 6 days)
  // Add 6 days to the date
  let endYear = year;
  let endMonth = month + 1; // 1-indexed month
  let endDay = day + 6;
  // Handle month overflow
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // Leap year check
  const isLeapYear = (y: number): boolean => {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  };
  const dim =
    endMonth === 2 && isLeapYear(endYear) ? 29 : daysInMonth[endMonth - 1];
  while (endDay > dim) {
    endDay -= dim;
    endMonth++;
    if (endMonth > 12) {
      endMonth = 1;
      endYear++;
    }
  }
  const weekEndDateStr = `${String(endYear).padStart(4, "0")}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}T00:00:00.000Z`;
  // 4. Check no existing timesheet for same employee + week_start_date
  // Convert weekStartDate to Date for Prisma comparison
  const weekStartDate = new Date(weekStartDateStr);
  const weekEndDate = new Date(weekEndDateStr);
  const existingTimesheet = await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
    where: {
      erp_hrm_employee_id: employee.id,
      week_start_date: weekStartDate,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existingTimesheet) {
    throw new HttpException("Timesheet already exists for this week", 409);
  }
  // 5. Query timelogs within date range [weekStartDate, weekEndDate] for this employee
  const timelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      erp_hrm_employee_id: employee.id,
      date: {
        gte: weekStartDate,
        lte: weekEndDate,
      },
    },
    select: {
      id: true,
      duration_minutes: true,
    },
  });
  // 6. Calculate total_hours from timelogs (sum of duration_minutes / 60)
  const totalMinutes = timelogs.reduce((sum, t) => sum + t.duration_minutes, 0);
  const totalHours = totalMinutes / 60;
  // 7. Create timesheet with junction table records in transaction
  const timesheetId = v4();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create timesheet record
    await tx.erp_hrm_timesheets.create({
      data: {
        id: timesheetId,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        status: "draft",
        total_hours: totalHours,
        submitted_at: null,
        reviewed_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        employee: { connect: { id: employee.id } },
      } satisfies Prisma.erp_hrm_timesheetsCreateInput,
    });
    // Create junction table records for each timelog
    if (timelogs.length > 0) {
      await tx.erp_hrm_timesheet_timelogs.createMany({
        data: timelogs.map((timelog) => ({
          id: v4(),
          erp_hrm_timesheet_id: timesheetId,
          erp_hrm_timelog_id: timelog.id,
          added_at: new Date(),
        })),
      });
    }
  });
  // 8. Query back with full data including timelogs for transformer response
  const fullTimesheet =
    await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: timesheetId },
      ...ErpHrmTimesheetTransformer.select(),
    });
  return await ErpHrmTimesheetTransformer.transform(fullTimesheet);
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
// import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberTimesheets(props: {
//   member: MemberPayload;
//   body: IErpHrmTimesheet.ICreate;
// }): Promise<IErpHrmTimesheet> {
//   const record = await MyGlobal.prisma.erp_hrm_timesheets.create({
//     data: await ErpHrmTimesheetCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmTimesheetTransformer.select(),
//   });
//   return await ErpHrmTimesheetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------