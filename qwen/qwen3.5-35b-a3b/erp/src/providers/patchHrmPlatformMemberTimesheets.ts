import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetAtSummaryTransformer } from "../transformers/HrmPlatformTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmPlatformTimesheet.IRequest;
}): Promise<IPageIHrmPlatformTimesheet.ISummary> {
  // Parse pagination parameters with defaults
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Build where clause for filtering
  const whereInput: Prisma.hrm_platform_timesheetsWhereInput = {
    deleted_at: null,
  };
  // Apply status filter if provided
  if (props.body.status !== undefined && props.body.status.length > 0) {
    whereInput.status = {
      in: props.body.status,
    };
  }
  // Apply date range filter if provided
  if (props.body.startDate !== undefined) {
    whereInput.start_date = {
      gte: props.body.startDate,
    };
  }
  if (props.body.endDate !== undefined) {
    whereInput.end_date = {
      lte: props.body.endDate,
    };
  }
  // Get member's employee for ownership validation
  const memberRecord =
    await MyGlobal.prisma.hrm_platform_members.findFirstOrThrow({
      where: {
        id: props.member.id,
      },
      include: {
        employees: true,
      },
    });
  if (memberRecord.employees.length === 0) {
    throw new HttpException("Member is not an employee", 403);
  }
  // Apply employee filter: member users can only access their own timesheets
  const employee = memberRecord.employees[0];
  whereInput.hrm_platform_employee_id = employee.id;
  // If employee_id is provided in request, validate it matches member's employee
  if (props.body.employee_id !== undefined) {
    if (props.body.employee_id !== employee.id) {
      throw new HttpException(
        "Cannot filter by other employee's timesheets",
        403,
      );
    }
  }
  // Build orderBy clause
  const sortOrder: "asc" | "desc" = props.body.order ?? "desc";
  const orderByInput: Prisma.hrm_platform_timesheetsOrderByWithRelationInput = {
    start_date: sortOrder,
  };
  // Override sort field if specified
  if (props.body.sort === "end_date") {
    orderByInput.end_date = sortOrder;
  } else if (props.body.sort === "status") {
    orderByInput.status = sortOrder;
  } else if (props.body.sort === "total_hours") {
    orderByInput.total_hours = sortOrder;
  } else if (props.body.sort === "created_at") {
    orderByInput.created_at = sortOrder;
  }
  // Execute findMany and count in parallel
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_timesheets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformTimesheetAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_timesheets.count({
      where: whereInput,
    }),
  ]);
  // Transform records using transformer
  const data = await ArrayUtil.asyncMap(
    records,
    HrmPlatformTimesheetAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const pages: number = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmPlatformTimesheet.ISummary;
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
// import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
// import { IPageIHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheet";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberTimesheets(props: {
//   member: MemberPayload;
//   body: IHrmPlatformTimesheet.IRequest;
// }): Promise<IPageIHrmPlatformTimesheet.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_timesheets.findMany({
//     ...HrmPlatformTimesheetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformTimesheetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------