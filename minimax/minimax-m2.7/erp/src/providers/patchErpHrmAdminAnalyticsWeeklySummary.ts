import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmWeeklySummary";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmWeeklySummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

/**
 * Parse YYYY-MM-DD string into year, month, day components.
 */
function parseDateParts(dateStr: string): {
  year: number;
  month: number;
  day: number;
} {
  const parts = dateStr.split("-");
  return {
    year: Number.parseInt(parts[0], 10),
    month: Number.parseInt(parts[1], 10),
    day: Number.parseInt(parts[2], 10),
  };
}
/**
 * Format year, month, day into YYYY-MM-DD string.
 */
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
/**
 * Calculate day of week (0=Sunday, 1=Monday, ..., 6=Saturday) using Zeller's congruence.
 * This avoids any Date object usage.
 */
function getDayOfWeek(year: number, month: number, day: number): number {
  // Zeller's congruence for Gregorian calendar
  if (month < 3) {
    month += 12;
  }
  const k = year % 100;
  const j = Math.floor(year / 100);
  const h =
    (day +
      Math.floor((13 * (month + 1)) / 5) +
      k +
      Math.floor(k / 4) +
      Math.floor(j / 4) +
      5 * j) %
    7;
  // Zeller's: 0=Saturday, 1=Sunday, 2=Monday, ..., 6=Friday
  // Convert to 0=Sunday, 1=Monday, ..., 6=Saturday
  return (h + 6) % 7;
}
/**
 * Get the Monday of the week containing the given date.
 */
function getWeekStart(dateStr: string): string {
  const { year, month, day } = parseDateParts(dateStr);
  const dayOfWeek = getDayOfWeek(year, month, day);
  // Days to subtract to reach Monday (Sunday=0, so subtract 6; Monday=1, subtract 0, etc.)
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return addDays(year, month, day, -daysToSubtract);
}
/**
 * Get the Sunday of the week containing the given date.
 */
function getWeekEnd(dateStr: string): string {
  const monday = getWeekStart(dateStr);
  const { year, month, day } = parseDateParts(monday);
  return addDays(year, month, day, 6);
}
/**
 * Add/subtract days from a date string, returning new date string.
 */
function addDays(
  year: number,
  month: number,
  day: number,
  days: number,
): string {
  // Calculate absolute day number (days since year 0)
  const totalDays = dateToDays(year, month, day) + days;
  const { y, m, d } = daysToDate(totalDays);
  return formatDate(y, m, d);
}
/**
 * Convert Gregorian date to absolute day number.
 */
function dateToDays(year: number, month: number, day: number): number {
  // Days before each month (non-leap year)
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // Check leap year
  const isLeapYear = (y: number) =>
    (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  if (isLeapYear(year)) {
    daysInMonth[2] = 29;
  }
  // Count days from year 0
  let total = 0;
  for (let y = 0; y < year; y++) {
    total += isLeapYear(y) ? 366 : 365;
  }
  for (let m = 1; m < month; m++) {
    total += daysInMonth[m];
  }
  total += day - 1;
  return total;
}
/**
 * Convert absolute day number to Gregorian date.
 */
function daysToDate(totalDays: number): {
  y: number;
  m: number;
  d: number;
} {
  // Days before each month (non-leap year)
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeapYear = (y: number) =>
    (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  let year = 0;
  let remaining = totalDays;
  // Find year
  while (remaining >= (isLeapYear(year) ? 366 : 365)) {
    remaining -= isLeapYear(year) ? 366 : 365;
    year++;
  }
  // Adjust February for leap year
  if (isLeapYear(year)) {
    daysInMonth[1] = 29;
  }
  // Find month
  let month = 1;
  while (remaining >= daysInMonth[month - 1]) {
    remaining -= daysInMonth[month - 1];
    month++;
  }
  return { y: year, m: month, d: remaining + 1 };
}
/**
 * Compare two YYYY-MM-DD date strings.
 * Returns -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareDates(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
/**
 * Get today's date as YYYY-MM-DD string (UTC).
 */
function getToday(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  return formatDate(year, month, day);
}
export async function patchErpHrmAdminAnalyticsWeeklySummary(props: {
  admin: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  };
  body: IErpHrmWeeklySummary.IRequest;
}): Promise<IPageIErpHrmWeeklySummary.ISummary> {
  const { body } = props;
  // Pagination parameters with defaults
  const page: number = body.page ?? 1;
  const limit: number = body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Default date range: last 12 weeks from today
  const today: string = getToday();
  const { year, month, day } = parseDateParts(today);
  const defaultStart: string = addDays(year, month, day, -84);
  const startDate: string = body.startDate ?? defaultStart;
  const endDate: string = body.endDate ?? today;
  // Validate project exists if provided
  if (body.projectId !== undefined) {
    const projectExists = await MyGlobal.prisma.erp_hrm_projects.findUnique({
      where: { id: body.projectId },
      select: { id: true },
    });
    if (projectExists === null) {
      throw new HttpException("Project not found", 404);
    }
  }
  // Generate complete weeks (Monday-Sunday) within the date range
  const completeWeeks: Array<{
    weekStartDate: string;
    weekEndDate: string;
  }> = [];
  let currentWeekStart: string = getWeekStart(startDate);
  while (compareDates(currentWeekStart, endDate) <= 0) {
    const currentWeekEnd: string = getWeekEnd(currentWeekStart);
    if (compareDates(currentWeekEnd, endDate) > 0) {
      break;
    }
    completeWeeks.push({
      weekStartDate: currentWeekStart,
      weekEndDate: currentWeekEnd,
    });
    // Move to next Monday
    const { year: y2, month: m2, day: d2 } = parseDateParts(currentWeekStart);
    currentWeekStart = addDays(y2, m2, d2, 7);
  }
  // Handle empty complete weeks
  if (completeWeeks.length === 0) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  // Query timelogs within the complete weeks range
  const rangeStart: string = completeWeeks[0].weekStartDate;
  const rangeEnd: string = completeWeeks[completeWeeks.length - 1].weekEndDate;
  const timelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      date: {
        gte: rangeStart,
        lte: rangeEnd + "T23:59:59.999Z",
      },
      ...(body.projectId !== undefined && {
        erp_hrm_project_id: body.projectId,
      }),
    },
    select: {
      date: true,
      duration_minutes: true,
      erp_hrm_employee_id: true,
    },
  });
  // Initialize metrics for each complete week
  const weekMetrics = new Map<
    string,
    {
      totalMinutes: number;
      timelogsCount: number;
      employeeIds: Set<string>;
    }
  >();
  for (const week of completeWeeks) {
    weekMetrics.set(week.weekStartDate, {
      totalMinutes: 0,
      timelogsCount: 0,
      employeeIds: new Set<string>(),
    });
  }
  // Aggregate timelogs into weekly metrics
  for (const timelog of timelogs) {
    const timelogDateStr: string = toISOStringSafe(timelog.date).split("T")[0];
    const timelogWeekStart: string = getWeekStart(timelogDateStr);
    const metrics = weekMetrics.get(timelogWeekStart);
    if (metrics !== undefined) {
      metrics.totalMinutes += timelog.duration_minutes;
      metrics.timelogsCount += 1;
      metrics.employeeIds.add(timelog.erp_hrm_employee_id);
    }
  }
  // Build summaries ordered by week start date ascending
  const summaries: IErpHrmWeeklySummary.ISummary[] = [];
  for (const week of completeWeeks) {
    const metrics = weekMetrics.get(week.weekStartDate);
    if (metrics !== undefined) {
      summaries.push({
        weekStartDate: week.weekStartDate,
        weekEndDate: week.weekEndDate,
        totalHours: metrics.totalMinutes / 60.0,
        timelogsCount: metrics.timelogsCount,
        employeesCount: metrics.employeeIds.size,
      });
    }
  }
  // Apply pagination
  const totalRecords: number = summaries.length;
  const totalPages: number = Math.ceil(totalRecords / limit);
  const paginatedData: IErpHrmWeeklySummary.ISummary[] = summaries.slice(
    skip,
    skip + limit,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: paginatedData,
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
// import { IErpHrmWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmWeeklySummary";
// import { IPageIErpHrmWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmWeeklySummary";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmAdminAnalyticsWeeklySummary(props: {
//   admin: AdminPayload;
//   body: IErpHrmWeeklySummary.IRequest;
// }): Promise<IPageIErpHrmWeeklySummary.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------