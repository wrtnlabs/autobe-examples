import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIWeeklySummaryReport";
import { IWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeeklySummaryReport";
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

export async function patchHrmPlatformAdminWeeklySummaryReports(props: {
  admin: AdminPayload;
  body: IWeeklySummaryReport.IRequest;
}): Promise<IPageIWeeklySummaryReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Parse dates
  const startDate = props.body.start_date;
  const endDate = props.body.end_date;
  // Build where condition for timelogs in date range
  const whereInput = {
    deleted_at: null,
    date: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
    employee: {
      deleted_at: null,
    },
    project: {
      deleted_at: null,
    },
  } satisfies Prisma.hrm_platform_timelogsWhereInput;
  // Add project filter if provided
  const projectFilter = props.body.project_id
    ? { hrm_platform_project_id: props.body.project_id }
    : {};
  // Query all timelogs in the date range (admin can see all organizations)
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: { ...whereInput, ...projectFilter },
    select: {
      id: true,
      duration: true,
      date: true,
      employee: {
        select: { id: true },
      },
    },
  });
  // Group timelogs by week (Monday-Sunday)
  const weekMap = new Map<
    string,
    {
      timelogs: typeof timelogs;
      employeeIds: Set<string>;
    }
  >();
  for (const timelog of timelogs) {
    const logDate = new Date(timelog.date);
    const dayOfWeek = logDate.getDay();
    // Calculate Monday of the week
    const monday = new Date(logDate);
    monday.setDate(logDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const weekKey = monday.toISOString().split("T")[0];
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        timelogs: [],
        employeeIds: new Set(),
      });
    }
    const weekData = weekMap.get(weekKey)!;
    weekData.timelogs.push(timelog);
    weekData.employeeIds.add(timelog.employee.id);
  }
  // Convert to array and sort by week start date descending
  const weeklyData = Array.from(weekMap.entries()).map(([weekStart, data]) => {
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    const totalMinutes = data.timelogs.reduce(
      (sum, tl) => sum + tl.duration,
      0,
    );
    return {
      week_start_date: weekStart,
      week_end_date: weekEndDate.toISOString().split("T")[0],
      total_hours: totalMinutes / 60.0,
      timelog_count: data.timelogs.length,
      employee_count: data.employeeIds.size,
    };
  });
  weeklyData.sort((a, b) => b.week_start_date.localeCompare(a.week_start_date));
  // Apply pagination
  const paginatedData = weeklyData.slice(skip, skip + limit);
  const total = weeklyData.length;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: paginatedData.map((week) => ({
      week_start_date: week.week_start_date as string & tags.Format<"date">,
      week_end_date: week.week_end_date as string & tags.Format<"date">,
      total_hours: week.total_hours,
      timelog_count: week.timelog_count as number & tags.Type<"int32">,
      employee_count: week.employee_count as number & tags.Type<"int32">,
    })),
  };
}
