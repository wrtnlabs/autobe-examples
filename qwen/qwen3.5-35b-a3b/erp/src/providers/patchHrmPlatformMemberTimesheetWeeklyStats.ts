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
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findUnique(
    {
      where: { id: props.member.session_id },
      select: { organization_id: true, member: true },
    },
  );
  if (session === null) {
    throw new HttpException("Session not found", 404);
  }
  const whereConditions: Array<Prisma.hrm_platform_timesheet_weekly_statsWhereInput> =
    [];
  if (props.body.organization_id !== undefined) {
    if (props.body.organization_id !== session.organization_id) {
      throw new HttpException("Forbidden", 403);
    }
    whereConditions.push({ organization_id: props.body.organization_id });
  } else {
    whereConditions.push({ organization_id: session.organization_id ?? "" });
  }
  if (props.body.employee_id !== undefined) {
    const targetEmployee =
      await MyGlobal.prisma.hrm_platform_employees.findUnique({
        where: { id: props.body.employee_id },
        select: { hrm_platform_organization_id: true },
      });
    if (targetEmployee === null) {
      throw new HttpException("Employee not found", 404);
    }
    if (
      targetEmployee.hrm_platform_organization_id !== session.organization_id
    ) {
      throw new HttpException("Forbidden", 403);
    }
    whereConditions.push({ employee_id: props.body.employee_id });
  }
  if (props.body.week_start?.gte !== undefined) {
    whereConditions.push({ week_start: { gte: props.body.week_start.gte } });
  }
  if (props.body.week_start?.lte !== undefined) {
    whereConditions.push({ week_start: { lte: props.body.week_start.lte } });
  }
  if (props.body.week_end?.gte !== undefined) {
    whereConditions.push({ week_end: { gte: props.body.week_end.gte } });
  }
  if (props.body.week_end?.lte !== undefined) {
    whereConditions.push({ week_end: { lte: props.body.week_end.lte } });
  }
  if (props.body.timesheet_count?.gte !== undefined) {
    whereConditions.push({
      timesheet_count: { gte: props.body.timesheet_count.gte },
    });
  }
  if (props.body.timesheet_count?.lte !== undefined) {
    whereConditions.push({
      timesheet_count: { lte: props.body.timesheet_count.lte },
    });
  }
  if (props.body.draft_timesheet_count?.gte !== undefined) {
    whereConditions.push({
      draft_timesheet_count: { gte: props.body.draft_timesheet_count.gte },
    });
  }
  if (props.body.draft_timesheet_count?.lte !== undefined) {
    whereConditions.push({
      draft_timesheet_count: { lte: props.body.draft_timesheet_count.lte },
    });
  }
  if (props.body.submitted_timesheet_count?.gte !== undefined) {
    whereConditions.push({
      submitted_timesheet_count: {
        gte: props.body.submitted_timesheet_count.gte,
      },
    });
  }
  if (props.body.submitted_timesheet_count?.lte !== undefined) {
    whereConditions.push({
      submitted_timesheet_count: {
        lte: props.body.submitted_timesheet_count.lte,
      },
    });
  }
  if (props.body.approved_timesheet_count?.gte !== undefined) {
    whereConditions.push({
      approved_timesheet_count: {
        gte: props.body.approved_timesheet_count.gte,
      },
    });
  }
  if (props.body.approved_timesheet_count?.lte !== undefined) {
    whereConditions.push({
      approved_timesheet_count: {
        lte: props.body.approved_timesheet_count.lte,
      },
    });
  }
  if (props.body.rejected_timesheet_count?.gte !== undefined) {
    whereConditions.push({
      rejected_timesheet_count: {
        gte: props.body.rejected_timesheet_count.gte,
      },
    });
  }
  if (props.body.rejected_timesheet_count?.lte !== undefined) {
    whereConditions.push({
      rejected_timesheet_count: {
        lte: props.body.rejected_timesheet_count.lte,
      },
    });
  }
  const whereInput: Prisma.hrm_platform_timesheet_weekly_statsWhereInput = {
    AND: whereConditions,
  } satisfies Prisma.hrm_platform_timesheet_weekly_statsWhereInput;
  const sortField = props.body.sort ?? "week_start";
  const orderValue = props.body.order ?? "desc";
  let orderByInput: Prisma.hrm_platform_timesheet_weekly_statsOrderByWithRelationInput;
  const sortOrder = orderValue.toLowerCase() as Prisma.SortOrder;
  if (sortField === "week_start" || sortField === "total_hours") {
    orderByInput = { [sortField]: sortOrder };
  } else if (sortField === "employee_name") {
    orderByInput = { employee: { display_name: sortOrder } };
  } else {
    orderByInput = { week_start: sortOrder };
  }
  const take = props.body.limit ?? 20;
  const cursor = props.body.cursor;
  if (cursor !== undefined) {
    let parsedCursor:
      | {
          organization_id: string & tags.Format<"uuid">;
          employee_id: string & tags.Format<"uuid">;
          week_start: string & tags.Format<"date-time">;
        }
      | undefined = undefined;
    try {
      parsedCursor = JSON.parse(cursor);
    } catch {
      throw new HttpException("Invalid cursor format", 400);
    }
    if (parsedCursor === undefined) {
      throw new HttpException("Invalid cursor format", 400);
    }
    const offsetWhere: Prisma.hrm_platform_timesheet_weekly_statsWhereInput = {
      AND: [
        whereInput,
        {
          organization_id: parsedCursor.organization_id,
          employee_id: parsedCursor.employee_id,
          week_start:
            sortOrder === "desc"
              ? { lt: parsedCursor.week_start }
              : { gt: parsedCursor.week_start },
        },
      ],
    } satisfies Prisma.hrm_platform_timesheet_weekly_statsWhereInput;
    const records =
      await MyGlobal.prisma.hrm_platform_timesheet_weekly_stats.findMany({
        ...HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.select(),
        where: offsetWhere,
        orderBy: orderByInput,
        take: take,
      });
    const total =
      await MyGlobal.prisma.hrm_platform_timesheet_weekly_stats.count({
        where: whereInput,
      });
    const pages = Math.ceil(total / take);
    const hasNext = records.length === take;
    let nextCursor: string | undefined = undefined;
    if (hasNext) {
      const lastRecord = records[records.length - 1];
      nextCursor = JSON.stringify({
        organization_id: lastRecord.organization.id,
        employee_id: lastRecord.employee.id,
        week_start: toISOStringSafe(lastRecord.week_start),
      });
    }
    const prevCursor:
      | {
          organization_id: string & tags.Format<"uuid">;
          employee_id: string & tags.Format<"uuid">;
          week_start: string & tags.Format<"date-time">;
        }
      | undefined =
      records.length > 0
        ? {
            organization_id: records[0].organization.id,
            employee_id: records[0].employee.id,
            week_start: toISOStringSafe(records[0].week_start),
          }
        : undefined;
    const current = 1;
    return {
      pagination: {
        current: current,
        limit: take,
        records: total,
        pages: pages,
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        records,
        HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.transform,
      ),
    };
  }
  let current = props.body.page ?? 1;
  if (current < 1 || take < 1 || take > 100) {
    throw new HttpException("Invalid pagination parameters", 400);
  }
  const skip = (current - 1) * take;
  const records =
    await MyGlobal.prisma.hrm_platform_timesheet_weekly_stats.findMany({
      ...HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.select(),
      where: whereInput,
      orderBy: orderByInput,
      skip: skip,
      take: take,
    });
  const total = await MyGlobal.prisma.hrm_platform_timesheet_weekly_stats.count(
    {
      where: whereInput,
    },
  );
  const pages = Math.ceil(total / take);
  return {
    pagination: {
      current: current,
      limit: take,
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