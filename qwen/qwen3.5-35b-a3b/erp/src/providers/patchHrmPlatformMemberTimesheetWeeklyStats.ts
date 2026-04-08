import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetWeeklyStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetWeeklyStatAtSummaryTransformer } from "../transformers/HrmPlatformTimesheetWeeklyStatAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimesheetWeeklyStats(props: {
  member: MemberPayload;
  body: IHrmPlatformTimesheetWeeklyStat.IRequest;
}): Promise<IPageIHrmPlatformTimesheetWeeklyStat.ISummary> {
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      expired_at: { gt: new Date() },
      hrm_platform_member_id: props.member.id,
      member: {
        id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
    },
    select: {
      organization_id: true,
    },
  });
  if (session === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasAdminManage = true;
  if (session.organization_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_member_id: props.member.id,
      hrm_platform_organization_id: session.organization_id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  const orgId = session.organization_id;
  const employeeIdFilter = props.body.employee_id;
  if (employeeIdFilter !== undefined && !hasAdminManage) {
    throw new HttpException("Forbidden", 403);
  }
  const whereClause: Prisma.hrm_platform_timesheet_weekly_statsWhereInput = {
    organization_id: orgId,
  };
  if (employeeIdFilter !== undefined) {
    const targetEmployee =
      await MyGlobal.prisma.hrm_platform_employees.findFirst({
        where: {
          id: employeeIdFilter,
          deleted_at: null,
        },
      });
    if (targetEmployee === null) {
      throw new HttpException("Employee not found", 404);
    }
    whereClause.employee_id = employeeIdFilter;
  }
  const weekStartFilter = props.body.week_start;
  if (weekStartFilter !== undefined) {
    const conditions: Prisma.DateTimeFilter<"hrm_platform_timesheet_weekly_stats">[] =
      [];
    if (weekStartFilter.gte !== undefined) {
      conditions.push({ gte: new Date(weekStartFilter.gte) });
    }
    if (weekStartFilter.lte !== undefined) {
      conditions.push({ lte: new Date(weekStartFilter.lte) });
    }
    if (conditions.length > 0) {
      whereClause.week_start =
        conditions.length === 1
          ? conditions[0]
          : ({
              AND: conditions,
            } as Prisma.DateTimeFilter<"hrm_platform_timesheet_weekly_stats">);
    }
  }
  const weekEndFilter = props.body.week_end;
  if (weekEndFilter !== undefined) {
    const conditions: Prisma.DateTimeFilter<"hrm_platform_timesheet_weekly_stats">[] =
      [];
    if (weekEndFilter.gte !== undefined) {
      conditions.push({ gte: new Date(weekEndFilter.gte) });
    }
    if (weekEndFilter.lte !== undefined) {
      conditions.push({ lte: new Date(weekEndFilter.lte) });
    }
    if (conditions.length > 0) {
      whereClause.week_end =
        conditions.length === 1
          ? conditions[0]
          : ({
              AND: conditions,
            } as Prisma.DateTimeFilter<"hrm_platform_timesheet_weekly_stats">);
    }
  }
  const timesheetCountFilter = props.body.timesheet_count;
  if (timesheetCountFilter !== undefined) {
    const conditions: Prisma.IntFilter<"hrm_platform_timesheet_weekly_stats">[] =
      [];
    if (timesheetCountFilter.gte !== undefined) {
      conditions.push({ gte: timesheetCountFilter.gte });
    }
    if (timesheetCountFilter.lte !== undefined) {
      conditions.push({ lte: timesheetCountFilter.lte });
    }
    if (conditions.length > 0) {
      whereClause.timesheet_count =
        conditions.length === 1
          ? conditions[0]
          : ({
              AND: conditions,
            } as Prisma.IntFilter<"hrm_platform_timesheet_weekly_stats">);
    }
  }
  const draftTimesheetCountFilter = props.body.draft_timesheet_count;
  if (draftTimesheetCountFilter !== undefined) {
    const conditions: Prisma.IntFilter<"hrm_platform_timesheet_weekly_stats">[] =
      [];
    if (draftTimesheetCountFilter.gte !== undefined) {
      conditions.push({ gte: draftTimesheetCountFilter.gte });
    }
    if (draftTimesheetCountFilter.lte !== undefined) {
      conditions.push({ lte: draftTimesheetCountFilter.lte });
    }
    if (conditions.length > 0) {
      whereClause.draft_timesheet_count =
        conditions.length === 1
          ? conditions[0]
          : ({
              AND: conditions,
            } as Prisma.IntFilter<"hrm_platform_timesheet_weekly_stats">);
    }
  }
  const submittedTimesheetCountFilter = props.body.submitted_timesheet_count;
  if (submittedTimesheetCountFilter !== undefined) {
    const conditions: Prisma.IntFilter<"hrm_platform_timesheet_weekly_stats">[] =
      [];
    if (submittedTimesheetCountFilter.gte !== undefined) {
      conditions.push({ gte: submittedTimesheetCountFilter.gte });
    }
    if (submittedTimesheetCountFilter.lte !== undefined) {
      conditions.push({ lte: submittedTimesheetCountFilter.lte });
    }
    if (conditions.length > 0) {
      whereClause.submitted_timesheet_count =
        conditions.length === 1
          ? conditions[0]
          : ({
              AND: conditions,
            } as Prisma.IntFilter<"hrm_platform_timesheet_weekly_stats">);
    }
  }
  const approvedTimesheetCountFilter = props.body.approved_timesheet_count;
  if (approvedTimesheetCountFilter !== undefined) {
    const conditions: Prisma.IntFilter<"hrm_platform_timesheet_weekly_stats">[] =
      [];
    if (approvedTimesheetCountFilter.gte !== undefined) {
      conditions.push({ gte: approvedTimesheetCountFilter.gte });
    }
    if (approvedTimesheetCountFilter.lte !== undefined) {
      conditions.push({ lte: approvedTimesheetCountFilter.lte });
    }
    if (conditions.length > 0) {
      whereClause.approved_timesheet_count =
        conditions.length === 1
          ? conditions[0]
          : ({
              AND: conditions,
            } as Prisma.IntFilter<"hrm_platform_timesheet_weekly_stats">);
    }
  }
  const rejectedTimesheetCountFilter = props.body.rejected_timesheet_count;
  if (rejectedTimesheetCountFilter !== undefined) {
    const conditions: Prisma.IntFilter<"hrm_platform_timesheet_weekly_stats">[] =
      [];
    if (rejectedTimesheetCountFilter.gte !== undefined) {
      conditions.push({ gte: rejectedTimesheetCountFilter.gte });
    }
    if (rejectedTimesheetCountFilter.lte !== undefined) {
      conditions.push({ lte: rejectedTimesheetCountFilter.lte });
    }
    if (conditions.length > 0) {
      whereClause.rejected_timesheet_count =
        conditions.length === 1
          ? conditions[0]
          : ({
              AND: conditions,
            } as Prisma.IntFilter<"hrm_platform_timesheet_weekly_stats">);
    }
  }
  const sortField = props.body.sort ?? "week_start";
  const sortOrder = props.body.order ?? "DESC";
  const orderBy: Prisma.hrm_platform_timesheet_weekly_statsOrderByWithRelationInput[] =
    sortField === "employee_name"
      ? [
          {
            employee: {
              display_name: sortOrder === "ASC" ? "asc" : "desc",
            },
          },
        ]
      : sortField === "total_hours"
        ? [
            {
              total_hours: sortOrder === "ASC" ? "asc" : "desc",
            },
          ]
        : [
            {
              week_start: sortOrder === "ASC" ? "asc" : "desc",
            },
          ];
  let take = props.body.limit ?? 100;
  if (take < 1) take = 1;
  if (take > 100) take = 100;
  let skip = 0;
  let cursorData:
    | {
        organization_id: string;
        week_start: string;
      }
    | undefined;
  if (props.body.cursor !== undefined) {
    try {
      const decoded = Buffer.from(props.body.cursor, "base64").toString(
        "utf-8",
      );
      cursorData = JSON.parse(decoded) as {
        organization_id: string;
        week_start: string;
      };
      if (cursorData.organization_id !== orgId) {
        throw new Error("Invalid cursor: organization mismatch");
      }
      skip = 1;
    } catch {
      cursorData = undefined;
    }
  }
  if (cursorData !== undefined) {
    const cursorFilter: Prisma.hrm_platform_timesheet_weekly_statsWhereInput = {
      organization_id: cursorData.organization_id,
      week_start: { gt: new Date(cursorData.week_start) },
    };
    whereClause.AND = [cursorFilter];
  }
  const records =
    await MyGlobal.prisma.hrm_platform_timesheet_weekly_stats.findMany({
      where: whereClause,
      orderBy: orderBy,
      take,
      skip,
      ...HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.hrm_platform_timesheet_weekly_stats.count(
    {
      where: whereClause,
    },
  );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const pages = Math.max(0, Math.ceil(total / limit));
  return {
    pagination: {
      current: cursorData !== undefined ? page + 1 : page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.transform,
    ),
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
// import { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
// import { IPageIHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetWeeklyStat";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberTimesheetWeeklyStats(props: {
//   member: MemberPayload;
//   body: IHrmPlatformTimesheetWeeklyStat.IRequest;
// }): Promise<IPageIHrmPlatformTimesheetWeeklyStat.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_timesheet_weekly_stats.findMany({
//     ...HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------