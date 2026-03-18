import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeWeeklySummary";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingEmployeeWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeWeeklySummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingEmployeeWeeklySummaries(props: {
  employee: EmployeePayload;
  body: IHrmTimeTrackingEmployeeWeeklySummary.IRequest;
}): Promise<IPageIHrmTimeTrackingEmployeeWeeklySummary.ISummary> {
  if (props.body.startDate === undefined || props.body.endDate === undefined) {
    throw new HttpException("Date range is required", 400);
  }
  const startEpoch = Date.parse(props.body.startDate);
  const endEpoch = Date.parse(props.body.endDate);
  if (Number.isNaN(startEpoch) === true || Number.isNaN(endEpoch) === true) {
    throw new HttpException("Invalid date range", 400);
  }
  if (startEpoch > endEpoch) {
    throw new HttpException("Invalid date range", 400);
  }
  const session =
    await MyGlobal.prisma.hrm_time_tracking_employee_sessions.findUniqueOrThrow(
      {
        where: { id: props.employee.session_id },
        select: {
          id: true,
          hrm_time_tracking_employee_id: true,
          hrm_time_tracking_organization_id: true,
          logged_out_at: true,
          expired_at: true,
        },
      },
    );
  if (session.hrm_time_tracking_employee_id !== props.employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (session.logged_out_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (session.hrm_time_tracking_organization_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (session.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.projectId !== undefined) {
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.body.projectId,
        hrm_time_tracking_organization_id:
          session.hrm_time_tracking_organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  }
  const whereInput = {
    hrm_time_tracking_organization_id:
      session.hrm_time_tracking_organization_id,
    deleted_at: null,
    worked_on: {
      gte: new globalThis.Date(startEpoch),
      lte: new globalThis.Date(endEpoch),
    },
    ...(props.body.projectId !== undefined
      ? { hrm_time_tracking_project_id: props.body.projectId }
      : {}),
  } satisfies Prisma.hrm_time_tracking_timelogsWhereInput;
  const timelogs = await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
    where: whereInput,
    select: {
      worked_on: true,
      duration_minutes: true,
      hrm_time_tracking_employee_id: true,
    },
    orderBy: {
      worked_on: "asc",
    },
  });
  const buckets = new Map<
    string,
    {
      week_start_date: string & tags.Format<"date-time">;
      week_end_date: string & tags.Format<"date-time">;
      total_minutes: number;
      timelog_count: number;
      employee_ids: Set<string>;
    }
  >();
  for (const timelog of timelogs) {
    const iso = toISOStringSafe(timelog.worked_on);
    const epoch = Date.parse(iso);
    const worked = new globalThis.Date(epoch);
    const day = worked.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new globalThis.Date(
      globalThis.Date.UTC(
        worked.getUTCFullYear(),
        worked.getUTCMonth(),
        worked.getUTCDate() + diffToMonday,
        0,
        0,
        0,
        0,
      ),
    );
    const sunday = new globalThis.Date(
      globalThis.Date.UTC(
        monday.getUTCFullYear(),
        monday.getUTCMonth(),
        monday.getUTCDate() + 6,
        23,
        59,
        59,
        999,
      ),
    );
    const weekStart = toISOStringSafe(monday);
    const weekEnd = toISOStringSafe(sunday);
    const bucket = buckets.get(weekStart);
    if (bucket !== undefined) {
      bucket.total_minutes += timelog.duration_minutes;
      bucket.timelog_count += 1;
      bucket.employee_ids.add(timelog.hrm_time_tracking_employee_id);
    } else {
      buckets.set(weekStart, {
        week_start_date: weekStart,
        week_end_date: weekEnd,
        total_minutes: timelog.duration_minutes,
        timelog_count: 1,
        employee_ids: new Set<string>([timelog.hrm_time_tracking_employee_id]),
      });
    }
  }
  const summaries = [...buckets.values()].map((bucket) => ({
    week_start_date: bucket.week_start_date,
    week_end_date: bucket.week_end_date,
    total_logged_hours: bucket.total_minutes / 60,
    timelog_count: bucket.timelog_count,
    employee_count: bucket.employee_ids.size,
  })) satisfies IHrmTimeTrackingEmployeeWeeklySummary.ISummary[];
  const descending =
    props.body.sort === "desc" ||
    props.body.sort === "-week_start_date" ||
    props.body.sort === "week_start_date_desc" ||
    props.body.sort === "week_start_date.desc";
  summaries.sort((left, right) =>
    descending === true
      ? right.week_start_date.localeCompare(left.week_start_date)
      : left.week_start_date.localeCompare(right.week_start_date),
  );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const records = summaries.length;
  const pages = records === 0 ? 0 : Math.ceil(records / limit);
  const offset = (page - 1) * limit;
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages,
    } satisfies IPage.IPagination,
    data: summaries.slice(offset, offset + limit),
  };
}
