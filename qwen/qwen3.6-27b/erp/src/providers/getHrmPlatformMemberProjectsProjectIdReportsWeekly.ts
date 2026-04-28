import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectWeeklySummary";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProjectWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectWeeklySummary";
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

export async function getHrmPlatformMemberProjectsProjectIdReportsWeekly(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IPageIHrmPlatformProjectWeeklySummary.ISummary> {
  // Verify project exists and is not soft-deleted (404 if not found)
  await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
    where: { id: props.projectId, deleted_at: null },
    select: { id: true },
  });
  // Fetch all non-deleted timelogs for the project
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: { hrm_platform_project_id: props.projectId, deleted_at: null },
    select: {
      date: true,
      duration_minutes: true,
      hrm_platform_employee_id: true,
    },
  });
  // Aggregate by ISO week (Monday start)
  interface WeeklyAccumulator {
    totalMinutes: number;
    entryCount: number;
    employees: Set<string>;
  }
  const weeklyMap = new Map<string, WeeklyAccumulator>();
  for (const tl of timelogs) {
    const d = new Date(tl.date);
    const dayOfWeek = d.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    d.setDate(d.getDate() - diffToMonday);
    d.setHours(0, 0, 0, 0);
    const weekKey = toISOStringSafe(d);
    const existing = weeklyMap.get(weekKey);
    if (existing !== undefined) {
      existing.totalMinutes += tl.duration_minutes;
      existing.entryCount += 1;
      existing.employees.add(tl.hrm_platform_employee_id);
    } else {
      weeklyMap.set(weekKey, {
        totalMinutes: tl.duration_minutes,
        entryCount: 1,
        employees: new Set([tl.hrm_platform_employee_id]),
      });
    }
  }
  // Build weekly summary records sorted by week_start DESC
  const summaries: IHrmPlatformProjectWeeklySummary.ISummary[] = Array.from(
    weeklyMap.entries(),
  )
    .map(([weekStart, acc]) => {
      const d = new Date(weekStart);
      const end = new Date(d.getTime());
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return {
        week_start: toISOStringSafe(d),
        week_end: toISOStringSafe(end),
        total_hours: Math.round((acc.totalMinutes / 60) * 100) / 100,
        timelogs_count: acc.entryCount,
        employee_count: acc.employees.size,
      };
    })
    .sort((a, b) =>
      a.week_start < b.week_start ? 1 : a.week_start > b.week_start ? -1 : 0,
    );
  // Pagination (default page 1, limit 30)
  const page = 1;
  const limit = 30;
  const totalRecords = summaries.length;
  const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);
  const data = summaries.slice((page - 1) * limit, page * limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: totalPages,
    } satisfies IPage.IPagination,
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
// import { IPageIHrmPlatformProjectWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectWeeklySummary";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformProjectWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectWeeklySummary";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberProjectsProjectIdReportsWeekly(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<IPageIHrmPlatformProjectWeeklySummary.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------