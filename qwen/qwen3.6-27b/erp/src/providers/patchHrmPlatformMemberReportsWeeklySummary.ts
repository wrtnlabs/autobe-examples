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
  const employees = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where: {
      hrm_platform_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const employeeIds = employees.map((e) => e.id);
  if (employeeIds.length === 0) {
    return {
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  const where: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
    hrm_platform_employee_id: { in: employeeIds },
    ...(props.body.project_id && {
      hrm_platform_project_id: props.body.project_id,
    }),
  };
  if (props.body.dateRangeStart || props.body.dateRangeEnd) {
    where.date = {
      gte: props.body.dateRangeStart
        ? new Date(props.body.dateRangeStart)
        : undefined,
      lte: props.body.dateRangeEnd
        ? new Date(props.body.dateRangeEnd)
        : undefined,
    };
  }
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where,
    select: {
      id: true,
      hrm_platform_employee_id: true,
      date: true,
      duration_minutes: true,
    },
  });
  const weekMap = new Map<
    string,
    {
      totalMinutes: number;
      count: number;
      employeeIds: Set<string>;
    }
  >();
  for (const timelog of timelogs) {
    const logDate = new Date(timelog.date);
    const dayOfWeek = logDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(logDate);
    weekStart.setDate(logDate.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().slice(0, 10);
    const agg = weekMap.get(weekKey);
    if (agg) {
      agg.totalMinutes += timelog.duration_minutes;
      agg.count += 1;
      agg.employeeIds.add(timelog.hrm_platform_employee_id);
    } else {
      weekMap.set(weekKey, {
        totalMinutes: timelog.duration_minutes,
        count: 1,
        employeeIds: new Set<string>([timelog.hrm_platform_employee_id]),
      });
    }
  }
  const summaries: IWeeklySummaryReport.ISummary[] = Array.from(
    weekMap.entries(),
    ([key, agg]) => {
      const weekStart = new Date(key);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(0, 0, 0, 0);
      return {
        week_start: weekStart.toISOString(),
        week_end: weekEnd.toISOString(),
        total_hours: agg.totalMinutes / 60,
        timelog_count: agg.count,
        employee_count: agg.employeeIds.size,
      };
    },
  );
  const isAsc = props.body.sort === "asc";
  summaries.sort((a, b) =>
    isAsc
      ? a.week_start.localeCompare(b.week_start)
      : b.week_start.localeCompare(a.week_start),
  );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const data = summaries.slice(skip, skip + limit);
  const totalRecords = summaries.length;
  return {
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit),
    } satisfies IPage.IPagination,
    data,
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
// import { IWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeeklySummaryReport";
// import { IPageIWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIWeeklySummaryReport";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberReportsWeeklySummary(props: {
//   member: MemberPayload;
//   body: IWeeklySummaryReport.IRequest;
// }): Promise<IPageIWeeklySummaryReport.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------