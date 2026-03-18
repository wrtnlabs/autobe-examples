import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingManagerReportsWeeklySummaries(props: {
  manager: ManagerPayload;
  body: IHrmTimeTrackingReport.IRequest;
}): Promise<IPageIHrmTimeTrackingReport.ISummary> {
  const session =
    await MyGlobal.prisma.hrm_time_tracking_manager_sessions.findUniqueOrThrow({
      where: {
        id: props.manager.session_id,
      },
      select: {
        id: true,
        hrm_time_tracking_manager_id: true,
        expired_at: true,
      },
    });
  if (session.hrm_time_tracking_manager_id !== props.manager.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (session.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Invalid session", 403);
  }
  await MyGlobal.prisma.hrm_time_tracking_managers.findUniqueOrThrow({
    where: {
      id: session.hrm_time_tracking_manager_id,
    },
    select: {
      id: true,
    },
  });
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findFirst({
    where: {
      name: "Manager",
      built_in: true,
      deleted_at: null,
      permissions: {
        some: {
          permission: "report:view",
          deleted_at: null,
        },
      },
    },
    select: {
      id: true,
    },
  });
  if (role === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.range_start_date === undefined ||
    props.body.range_end_date === undefined ||
    props.body.range_start_date === null ||
    props.body.range_end_date === null
  ) {
    throw new HttpException("Date range is required", 400);
  }
  if (props.body.project_id !== undefined && props.body.project_id !== null) {
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.body.project_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    worked_on: {
      gte: new globalThis.Date(props.body.range_start_date),
      lte: new globalThis.Date(props.body.range_end_date),
    },
    ...(props.body.project_id !== undefined && props.body.project_id !== null
      ? { hrm_time_tracking_project_id: props.body.project_id }
      : {}),
    ...(props.body.billable_only === true ? { billable: true } : {}),
  } satisfies Prisma.hrm_time_tracking_timelogsWhereInput;
  const timelogs = await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
    where: whereInput,
    select: {
      id: true,
      hrm_time_tracking_employee_id: true,
      worked_on: true,
      duration_minutes: true,
    },
    orderBy: {
      worked_on: "asc",
    },
  });
  const getMondayStart = (
    value: (string & tags.Format<"date-time">) | Date,
  ): string => {
    const normalized = new globalThis.Date(toISOStringSafe(value));
    normalized.setUTCHours(0, 0, 0, 0);
    const day = normalized.getUTCDay();
    const offset = day === 0 ? 6 : day - 1;
    normalized.setUTCDate(normalized.getUTCDate() - offset);
    return toISOStringSafe(normalized);
  };
  const getWeekEnd = (weekStart: string): string => {
    const end = new globalThis.Date(weekStart);
    end.setUTCDate(end.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    return toISOStringSafe(end);
  };
  const buckets = new Map<
    string,
    {
      week_start: string & tags.Format<"date-time">;
      week_end: string & tags.Format<"date-time">;
      total_minutes: number;
      timelog_count: number;
      employee_ids: Set<string>;
    }
  >();
  for (const timelog of timelogs) {
    const weekStart = getMondayStart(timelog.worked_on);
    const existing = buckets.get(weekStart);
    if (existing === undefined) {
      buckets.set(weekStart, {
        week_start: typia.assert<string & tags.Format<"date-time">>(weekStart),
        week_end: typia.assert<string & tags.Format<"date-time">>(
          getWeekEnd(weekStart),
        ),
        total_minutes: timelog.duration_minutes,
        timelog_count: 1,
        employee_ids: new Set<string>([timelog.hrm_time_tracking_employee_id]),
      });
    } else {
      existing.total_minutes += timelog.duration_minutes;
      existing.timelog_count += 1;
      existing.employee_ids.add(timelog.hrm_time_tracking_employee_id);
    }
  }
  const weeklyRows = Array.from(buckets.values()).map((bucket) => ({
    week_start: bucket.week_start,
    week_end: bucket.week_end,
    total_hours: (bucket.total_minutes / 60).toFixed(2),
    timelog_count: bucket.timelog_count,
    employee_count: bucket.employee_ids.size,
  }));
  weeklyRows.sort((left, right) => {
    if (props.body.sort === "week_asc") {
      return left.week_start.localeCompare(right.week_start);
    }
    return right.week_start.localeCompare(left.week_start);
  });
  const total = weeklyRows.length;
  const paged = weeklyRows.slice(skip, skip + limit);
  return {
    data: paged.map((row) => ({
      id: typia.assert<string & tags.Format<"uuid">>(v4()),
      name: `${row.week_start} | total_hours=${row.total_hours} | timelogs=${row.timelog_count} | employees=${row.employee_count}`,
      report_type: "weekly_summary_report",
      range_start_date: row.week_start,
      range_end_date: row.week_end,
      group_by: "week",
      billable_only: props.body.billable_only ?? null,
      include_non_billable: props.body.include_non_billable ?? null,
      created_at: row.week_start,
      updated_at: row.week_end,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
