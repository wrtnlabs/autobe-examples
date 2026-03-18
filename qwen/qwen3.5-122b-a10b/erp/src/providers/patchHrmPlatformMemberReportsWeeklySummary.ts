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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberReportsWeeklySummary(props: {
  member: MemberPayload;
  body: IWeeklySummaryReport.IRequest;
}): Promise<IPageIWeeklySummaryReport.ISummary> {
  // Validate date range
  const startDate = props.body.start_date;
  const endDate = props.body.end_date;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      throw new HttpException(
        "start_date must be before or equal to end_date",
        400,
      );
    }
    const diffYears =
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (diffYears > 2) {
      throw new HttpException("Date range cannot exceed 2 years", 400);
    }
  }
  // Get member's employee record to determine organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  // Validate project if provided
  if (props.body.project_id) {
    const project = await MyGlobal.prisma.hrm_platform_projects.findFirst({
      where: {
        id: props.body.project_id,
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        deleted_at: null,
      },
    });
    if (!project) {
      throw new HttpException("Project not found", 404);
    }
  }
  // Build where clause for timelogs
  const whereInput: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
    employee: {
      hrm_platform_organization_id: employee.hrm_platform_organization_id,
      deleted_at: null,
    },
    ...(startDate && {
      date: {
        gte: new Date(startDate),
      },
    }),
    ...(endDate && {
      date: {
        lte: new Date(endDate),
      },
    }),
    ...(props.body.project_id && {
      hrm_platform_project_id: props.body.project_id,
    }),
  };
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.page_size ?? 20;
  const skip = (page - 1) * limit;
  // Fetch all timelogs for aggregation
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: whereInput,
    select: {
      date: true,
      duration_minutes: true,
      hrm_platform_employee_id: true,
    },
    orderBy: {
      date: "asc",
    },
  });
  // Group by ISO week (Monday-based)
  const weekMap = new Map<
    string,
    {
      totalMinutes: number;
      timelogCount: number;
      employeeIds: Set<string>;
    }
  >();
  for (const timelog of timelogs) {
    const date = new Date(timelog.date);
    // Calculate Monday of the ISO week
    const dayOfWeek = date.getUTCDay() || 7; // Convert Sunday (0) to 7
    const monday = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() - (dayOfWeek - 1),
      ),
    );
    monday.setUTCHours(0, 0, 0, 0);
    const weekStartKey = monday.toISOString().split("T")[0];
    const existing = weekMap.get(weekStartKey) ?? {
      totalMinutes: 0,
      timelogCount: 0,
      employeeIds: new Set<string>(),
    };
    existing.totalMinutes += timelog.duration_minutes;
    existing.timelogCount += 1;
    existing.employeeIds.add(timelog.hrm_platform_employee_id);
    weekMap.set(weekStartKey, existing);
  }
  // Convert to array and sort
  const weekData = Array.from(weekMap.entries()).map(([weekStart, data]) => ({
    weekStartDate: new Date(weekStart),
    totalHours: data.totalMinutes / 60,
    timelogCount: data.timelogCount,
    employeeCount: data.employeeIds.size,
  }));
  // Apply sorting
  const sortedData = weekData.sort((a, b) => {
    if (props.body.order_by === "total_hours") {
      return b.totalHours - a.totalHours;
    } else if (props.body.order_by === "employee_count") {
      return b.employeeCount - a.employeeCount;
    } else {
      return a.weekStartDate.getTime() - b.weekStartDate.getTime();
    }
  });
  // Apply pagination
  const total = sortedData.length;
  const paginatedData = sortedData.slice(skip, skip + limit);
  // Transform to DTO format
  const data = await ArrayUtil.asyncMap(paginatedData, async (week) => {
    return {
      week_start_date: week.weekStartDate.toISOString() as string &
        tags.Format<"date-time">,
      total_hours: week.totalHours,
      timelog_count: week.timelogCount as number & tags.Type<"int32">,
      employee_count: week.employeeCount as number & tags.Type<"int32">,
    } satisfies IWeeklySummaryReport.ISummary;
  });
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIWeeklySummaryReport.ISummary;
}
