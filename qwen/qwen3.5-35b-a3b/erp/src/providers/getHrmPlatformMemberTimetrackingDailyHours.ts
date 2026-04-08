import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPlatformTimeTrackingDailyHour } from "@ORGANIZATION/PROJECT-api/lib/structures/IPlatformTimeTrackingDailyHour";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberTimetrackingDailyHours(props: {
  member: MemberPayload;
}): Promise<IPlatformTimeTrackingDailyHour.IResponse> {
  // Step 1: Get employee record from member_id
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_member_id: props.member.id,
      is_pending: false,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Step 2: Get organization timezone configuration
  const organizationTimezone =
    await MyGlobal.prisma.hrm_platform_time_tracking_timezones.findFirst({
      where: {
        organization_id: employee.hrm_platform_organization_id,
        deleted_at: null,
      },
      select: {
        timezone: true,
      },
    });
  if (organizationTimezone === null) {
    throw new HttpException("Organization timezone not configured", 404);
  }
  // Step 3: Get current server time as string
  const serverTime: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  // Step 4: Calculate today's date in organization timezone
  const todayDate = getTodayDate(serverTime, organizationTimezone.timezone);
  // Step 5: Calculate today's date range in UTC for querying
  const [startDateUTC, endDateUTC] = getTodayDateRangeUTC(todayDate);
  // Step 6: Query timelogs for today
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      employee_id: employee.id,
      deleted_at: null,
      start_datetime: {
        gte: startDateUTC,
        lte: endDateUTC,
      },
    },
    select: {
      duration_minutes: true,
    },
  });
  // Step 7: Calculate total hours (convert minutes to hours)
  const totalMinutes = timelogs.reduce(
    (
      sum: number,
      log: {
        duration_minutes: number;
      },
    ) => sum + log.duration_minutes,
    0,
  );
  const totalHours: number = totalMinutes / 60;
  // Step 8: Return response
  return {
    hours: totalHours,
    date: todayDate,
  } satisfies IPlatformTimeTrackingDailyHour.IResponse;
}
// Helper: Calculate timezone offset in minutes from IANA timezone name
function getTzOffsetMinutes(timezone: string): number {
  // Simplified timezone offset lookup table (in minutes from UTC)
  const timezoneOffsets: Record<string, number> = {
    "Asia/Seoul": 9 * 60,
    "Asia/Tokyo": 9 * 60,
    "Asia/Shanghai": 8 * 60,
    "Asia/Hong_Kong": 8 * 60,
    "Asia/Singapore": 8 * 60,
    "Asia/Bangkok": 7 * 60,
    "Asia/Kolkata": 5.5 * 60,
    "Asia/Dubai": 4 * 60,
    "Europe/London": 0,
    "Europe/Paris": 1 * 60,
    "Europe/Berlin": 1 * 60,
    "America/New_York": -5 * 60,
    "America/Chicago": -6 * 60,
    "America/Los_Angeles": -8 * 60,
    "America/Denver": -7 * 60,
    "Pacific/Auckland": 12 * 60,
    "Australia/Sydney": 10 * 60,
  };
  const offset = timezoneOffsets[timezone];
  return offset !== undefined ? offset : 0;
}
// Helper: Get today's date in organization timezone from ISO time string
function getTodayDate(
  serverTime: string & tags.Format<"date-time">,
  timezone: string,
): string & tags.Format<"date"> {
  const offsetMinutes = getTzOffsetMinutes(timezone);
  // Parse ISO string components
  const datePart = serverTime.split("T")[0]; // "YYYY-MM-DD"
  const timePart = serverTime.split("T")[1].split(".")[0].split("Z")[0]; // "HH:MM:SS"
  // Extract components
  const [yearStr, monthStr, dayStr] = datePart.split("-").map(Number);
  const [hourStr, minStr] = timePart.split(":").map(Number);
  // Apply timezone offset to get local time in minutes
  const serverMinutes = hourStr * 60 + minStr;
  const localMinutes = serverMinutes + offsetMinutes;
  // Calculate local hour and determine if we need to adjust the day
  const localHoursInDay = Math.floor(localMinutes / 60);
  const normalizedHours = ((localHoursInDay % 24) + 24) % 24;
  // Determine day adjustment based on hour rollover
  let day = dayStr;
  if (localHoursInDay < 0) {
    day -= 1;
  } else if (localHoursInDay >= 24) {
    day += 1;
  }
  // Format as YYYY-MM-DD
  const formattedYear = yearStr.toString();
  const formattedMonth = monthStr.toString().padStart(2, "0");
  const formattedDay = String(day).padStart(2, "0");
  return `${formattedYear}-${formattedMonth}-${formattedDay}`;
}
// Helper: Get today's date range in UTC
function getTodayDateRangeUTC(
  todayDate: string & tags.Format<"date">,
): [string & tags.Format<"date-time">, string & tags.Format<"date-time">] {
  const [year, month, day] = todayDate.split("-").map(Number);
  const startUTC: string & tags.Format<"date-time"> =
    `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T00:00:00.000Z`;
  const endUTC: string & tags.Format<"date-time"> =
    `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T23:59:59.999Z`;
  return [startUTC, endUTC];
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
// import { IPlatformTimeTrackingDailyHour } from "@ORGANIZATION/PROJECT-api/lib/structures/IPlatformTimeTrackingDailyHour";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberTimetrackingDailyHours(props: {
//   member: MemberPayload;
// }): Promise<IPlatformTimeTrackingDailyHour.IResponse> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------