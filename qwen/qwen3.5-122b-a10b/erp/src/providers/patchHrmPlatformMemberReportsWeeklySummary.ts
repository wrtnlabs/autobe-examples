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
        "Start date must be before or equal to end date",
        400,
      );
    }
    // Check date range not too large (max 2 years)
    const diffYears =
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (diffYears > 2) {
      throw new HttpException("Date range cannot exceed 2 years", 400);
    }
  }
  // Get member's organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 403);
  }
  const organizationId = employee.hrm_platform_organization_id;
  // Validate project if provided
  if (props.body.project_id) {
    const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
      where: {
        id: props.body.project_id,
        deleted_at: null,
      },
    });
    if (!project) {
      throw new HttpException("Project not found", 404);
    }
    if (project.hrm_platform_organization_id !== organizationId) {
      throw new HttpException("Project not found", 404);
    }
  }
  // Build where clause for timelogs
  const whereInput: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
    employee: {
      hrm_platform_organization_id: organizationId,
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
  } satisfies Prisma.hrm_platform_timelogsWhereInput;
  // Get pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.page_size ?? 20));
  const skip = (page - 1) * limit;
  // Get all timelogs for aggregation (Prisma groupBy doesn't support date truncation)
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: whereInput,
    select: {
      date: true,
      duration_minutes: true,
      hrm_platform_employee_id: true,
    },
  });
  // Group by ISO week in memory
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
    // Get Monday of the week (ISO week start)
    const dayOfWeek = date.getUTCDay();
    const monday = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1),
        0,
        0,
        0,
        0,
      ),
    );
    const weekKey = monday.toISOString().split("T")[0];
    const existing = weekMap.get(weekKey) ?? {
      totalMinutes: 0,
      timelogCount: 0,
      employeeIds: new Set(),
    };
    existing.totalMinutes += timelog.duration_minutes;
    existing.timelogCount += 1;
    existing.employeeIds.add(timelog.hrm_platform_employee_id);
    weekMap.set(weekKey, existing);
  }
  // Convert to summary array
  const summaries = Array.from(weekMap.entries()).map(([weekKey, data]) => ({
    week_start_date: `${weekKey}T00:00:00Z` as string &
      tags.Format<"date-time">,
    total_hours: data.totalMinutes / 60,
    timelog_count: data.timelogCount as number & tags.Type<"int32">,
    employee_count: data.employeeIds.size as number & tags.Type<"int32">,
  }));
  // Sort
  summaries.sort((a, b) => {
    if (props.body.order_by === "total_hours") {
      return b.total_hours - a.total_hours;
    } else if (props.body.order_by === "employee_count") {
      return b.employee_count - a.employee_count;
    }
    return a.week_start_date.localeCompare(b.week_start_date);
  });
  // Paginate
  const total = summaries.length;
  const paginatedData = summaries.slice(skip, skip + limit);
  return {
    data: paginatedData,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  } satisfies IPageIWeeklySummaryReport.ISummary;
}
