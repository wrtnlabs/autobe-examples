import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingWeeklySummaryReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingWeeklySummaryReport";
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

export async function patchHrmTimeTrackingMemberReportsWeeklySummary(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingWeeklySummaryReport.IRequest;
}): Promise<IPageIHrmTimeTrackingWeeklySummaryReport> {
  if (props.member.type !== "member") throw new HttpException("Forbidden", 403);
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1 || limit < 1) throw new HttpException("Invalid pagination", 400);
  if (props.body.startDate > props.body.endDate)
    throw new HttpException("Invalid date range", 400);
  const timelogs = await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
    where: {
      work_date: {
        gte: props.body.startDate,
        lte: props.body.endDate,
      },
      ...(props.body.project_id !== undefined
        ? { project_id: props.body.project_id }
        : {}),
    },
    select: {
      work_date: true,
      duration_minutes: true,
      employee_id: true,
    },
    orderBy: {
      work_date: "asc",
    },
  });
  const buckets = new Map<
    string,
    {
      weekStart: Date;
      weekEnd: Date;
      totalMinutes: number;
      timelogCount: number;
      employeeIds: Set<string>;
    }
  >();
  for (const timelog of timelogs) {
    const workDate = new Date(timelog.work_date);
    const weekday = workDate.getUTCDay();
    const mondayOffset = (weekday + 6) % 7;
    const weekStart = new Date(
      Date.UTC(
        workDate.getUTCFullYear(),
        workDate.getUTCMonth(),
        workDate.getUTCDate() - mondayOffset,
      ),
    );
    const weekEnd = new Date(
      Date.UTC(
        workDate.getUTCFullYear(),
        workDate.getUTCMonth(),
        workDate.getUTCDate() - mondayOffset + 6,
        23,
        59,
        59,
        999,
      ),
    );
    const key = `${weekStart.toISOString()}__${weekEnd.toISOString()}`;
    const current = buckets.get(key);
    if (current === undefined) {
      buckets.set(key, {
        weekStart,
        weekEnd,
        totalMinutes: timelog.duration_minutes,
        timelogCount: 1,
        employeeIds: new Set([timelog.employee_id]),
      });
    } else {
      current.totalMinutes += timelog.duration_minutes;
      current.timelogCount += 1;
      current.employeeIds.add(timelog.employee_id);
    }
  }
  const ordered = Array.from(buckets.values()).sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime(),
  );
  const sliced = ordered.slice((page - 1) * limit, page * limit);
  return {
    pagination: {
      current: page,
      limit,
      records: ordered.length,
      pages: Math.ceil(ordered.length / limit),
    },
    data: sliced.map((bucket) => ({
      weekStart: bucket.weekStart.toISOString(),
      weekEnd: bucket.weekEnd.toISOString(),
      totalHours: bucket.totalMinutes / 60,
      timelogCount: bucket.timelogCount,
      employeeCount: bucket.employeeIds.size,
    })) as IPageIHrmTimeTrackingWeeklySummaryReport["data"],
  };
}
