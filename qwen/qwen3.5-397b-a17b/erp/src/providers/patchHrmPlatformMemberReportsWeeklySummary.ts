import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformWeeklySummaryReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformWeeklySummaryReport";
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
  body: IHrmPlatformWeeklySummaryReport.IRequest;
}): Promise<IPageIHrmPlatformWeeklySummaryReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get member's organization_id from membership
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirstOrThrow(
      {
        where: {
          hrm_platform_member_id: props.member.id,
          deleted_at: null,
        },
        select: {
          hrm_platform_organization_id: true,
        },
      },
    );
  // Build date filter conditions
  const dateConditions: Prisma.hrm_platform_timelogsWhereInput[] = [];
  if (props.body.from !== undefined) {
    dateConditions.push({
      date: {
        gte: new Date(props.body.from),
      },
    });
  }
  if (props.body.to !== undefined) {
    dateConditions.push({
      date: {
        lte: new Date(props.body.to),
      },
    });
  }
  // Build where clause
  const whereInput: Prisma.hrm_platform_timelogsWhereInput = {
    employee: {
      organization_id: membership.hrm_platform_organization_id,
      deleted_at: null,
    },
    deleted_at: null,
    ...(props.body.project_id !== undefined && {
      hrm_platform_project_id: props.body.project_id,
    }),
    ...(dateConditions.length > 0 && {
      AND: dateConditions,
    }),
  } satisfies Prisma.hrm_platform_timelogsWhereInput;
  // Fetch all timelogs matching criteria (for aggregation)
  const allTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: whereInput,
    select: {
      date: true,
      duration_minutes: true,
      hrm_platform_employee_id: true,
    },
    orderBy: {
      date: "desc",
    },
  });
  // Helper function to get ISO week start (Monday) as date string
  const getWeekStart = (date: Date): string => {
    const d = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
    d.setUTCDate(d.getUTCDate() + diff);
    return d.toISOString().split("T")[0];
  };
  // Helper function to get week end (Sunday) from week start date string
  const getWeekEnd = (weekStart: string): string => {
    const monday = new Date(weekStart + "T00:00:00Z");
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return sunday.toISOString().split("T")[0];
  };
  // Aggregate by ISO week
  const weekMap = new Map<
    string,
    {
      totalMinutes: number;
      timelogCount: number;
      employeeSet: Set<string>;
    }
  >();
  for (const timelog of allTimelogs) {
    const weekStart = getWeekStart(timelog.date);
    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, {
        totalMinutes: 0,
        timelogCount: 0,
        employeeSet: new Set(),
      });
    }
    const weekData = weekMap.get(weekStart)!;
    weekData.totalMinutes += timelog.duration_minutes;
    weekData.timelogCount += 1;
    weekData.employeeSet.add(timelog.hrm_platform_employee_id);
  }
  // Convert map to array and sort by week_start_date DESC
  const allWeeks = Array.from(weekMap.entries())
    .map(
      ([weekStart, data]) =>
        ({
          week_start_date: weekStart as string & tags.Format<"date">,
          week_end_date: getWeekEnd(weekStart) as string & tags.Format<"date">,
          total_hours: Math.round((data.totalMinutes / 60) * 100) / 100,
          timelog_count: data.timelogCount,
          employee_count: data.employeeSet.size,
        }) satisfies IHrmPlatformWeeklySummaryReport.ISummary,
    )
    .sort((a, b) => b.week_start_date.localeCompare(a.week_start_date));
  // Apply pagination
  const total = allWeeks.length;
  const paginatedWeeks = allWeeks.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: paginatedWeeks,
  } satisfies IPageIHrmPlatformWeeklySummaryReport.ISummary;
}
