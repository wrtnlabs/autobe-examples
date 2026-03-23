import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimeReport";
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

export async function patchHrmPlatformAdminTimeReports(props: {
  admin: AdminPayload;
  body: IHrmPlatformTimeReport.IRequest;
}): Promise<IPageIHrmPlatformTimeReport> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const grouping = props.body.grouping ?? "employee";
  const weeklySummary = props.body.weekly_summary ?? false;
  // Build WHERE clause - platform admin sees all organizations
  const whereInput: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
    ...(props.body.start_date && {
      date: {
        gte: new Date(props.body.start_date),
      },
    }),
    ...(props.body.end_date && {
      date: {
        lt: new Date(props.body.end_date),
      },
    }),
    ...(props.body.project_id && {
      hrm_platform_project_id: props.body.project_id,
    }),
    ...(props.body.task_id && {
      hrm_platform_task_id: props.body.task_id,
    }),
    ...(props.body.employee_id && {
      hrm_platform_employee_id: props.body.employee_id,
    }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
  };
  // Fetch all timelogs matching criteria with select for proper typing
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: whereInput,
    select: {
      id: true,
      hrm_platform_employee_id: true,
      hrm_platform_project_id: true,
      hrm_platform_task_id: true,
      date: true,
      duration: true,
      billable: true,
      employee: {
        select: {
          id: true,
          member: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
  // Aggregate by grouping dimension
  const aggregatedMap = new Map<
    string,
    {
      groupType: "employee" | "project" | "task";
      groupId: string;
      groupName: string;
      totalMinutes: number;
      billableMinutes: number;
      nonBillableMinutes: number;
      entryCount: number;
      weeklyData: Map<
        string,
        {
          totalMinutes: number;
          billableMinutes: number;
          nonBillableMinutes: number;
        }
      >;
    }
  >();
  for (const timelog of timelogs) {
    let key: string;
    let groupType: "employee" | "project" | "task";
    let groupName: string;
    if (grouping === "employee") {
      key = timelog.hrm_platform_employee_id;
      groupType = "employee";
      groupName = timelog.employee.member.email;
    } else if (grouping === "project") {
      key = timelog.hrm_platform_project_id;
      groupType = "project";
      groupName = timelog.project.name;
    } else {
      // Task grouping - skip if no task_id or task is null
      if (!timelog.hrm_platform_task_id || !timelog.task) {
        continue;
      }
      key = timelog.hrm_platform_task_id;
      groupType = "task";
      groupName = timelog.task.title;
    }
    if (!aggregatedMap.has(key)) {
      aggregatedMap.set(key, {
        groupType,
        groupId: key,
        groupName,
        totalMinutes: 0,
        billableMinutes: 0,
        nonBillableMinutes: 0,
        entryCount: 0,
        weeklyData: new Map(),
      });
    }
    const entry = aggregatedMap.get(key)!;
    entry.totalMinutes += timelog.duration;
    entry.entryCount += 1;
    if (timelog.billable) {
      entry.billableMinutes += timelog.duration;
    } else {
      entry.nonBillableMinutes += timelog.duration;
    }
    // Weekly aggregation
    if (weeklySummary) {
      const weekStart = new Date(timelog.date);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString().split("T")[0];
      if (!entry.weeklyData.has(weekKey)) {
        entry.weeklyData.set(weekKey, {
          totalMinutes: 0,
          billableMinutes: 0,
          nonBillableMinutes: 0,
        });
      }
      const weeklyEntry = entry.weeklyData.get(weekKey)!;
      weeklyEntry.totalMinutes += timelog.duration;
      if (timelog.billable) {
        weeklyEntry.billableMinutes += timelog.duration;
      } else {
        weeklyEntry.nonBillableMinutes += timelog.duration;
      }
    }
  }
  // Convert to array and sort by total_hours descending
  const aggregatedArray = Array.from(aggregatedMap.values()).sort(
    (a, b) => b.totalMinutes - a.totalMinutes,
  );
  // Apply pagination to aggregated results
  const paginatedArray = aggregatedArray.slice(skip, skip + limit);
  // Transform to response format
  const data: IHrmPlatformTimeReport[] = paginatedArray.map((entry) => {
    const weeklySummaryData:
      | IHrmPlatformTimeReport.IWeeklySummary[]
      | undefined =
      weeklySummary && entry.weeklyData.size > 0
        ? Array.from(entry.weeklyData.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([weekKey, weeklyEntry]) => ({
              week_start_date: weekKey as unknown as string &
                tags.Format<"date">,
              total_hours: weeklyEntry.totalMinutes / 60.0,
              billable_hours: weeklyEntry.billableMinutes / 60.0,
              non_billable_hours: weeklyEntry.nonBillableMinutes / 60.0,
            }))
        : undefined;
    return {
      group_type: entry.groupType,
      group_id: entry.groupId as unknown as string & tags.Format<"uuid">,
      group_name: entry.groupName,
      total_hours: entry.totalMinutes / 60.0,
      billable_hours: entry.billableMinutes / 60.0,
      non_billable_hours: entry.nonBillableMinutes / 60.0,
      entry_count: entry.entryCount as unknown as number & tags.Type<"int32">,
      weekly_summary: weeklySummaryData,
    };
  });
  // Calculate total groups for pagination
  const totalGroups = aggregatedArray.length;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalGroups,
      pages: Math.ceil(totalGroups / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
