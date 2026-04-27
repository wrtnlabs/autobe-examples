import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimelogAtSummaryTransformer } from "../transformers/HrmTimeTrackingTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimelog.IRequest;
}): Promise<IPageIHrmTimeTrackingTimelog.ISummary> {
  // 1. Find the employee record for this authenticated member
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_organization_id: true,
      hrm_time_tracking_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  // 2. Check if the employee's role has time:view_all permission
  const hasTimeViewAll =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "time:view_all",
        deleted_at: null,
      },
    });
  // 3. Build WHERE clause
  const where: Prisma.hrm_time_tracking_timelogsWhereInput = {
    deleted_at: null,
    project: {
      hrm_time_tracking_organization_id:
        employee.hrm_time_tracking_organization_id,
    },
  };
  // Employee scope based on permissions
  if (hasTimeViewAll === null) {
    // No time:view_all — can only see own timelogs
    where.hrm_time_tracking_employee_id = employee.id;
  } else if (props.body.employeeId !== undefined) {
    // Has time:view_all and explicit employee filter provided
    where.hrm_time_tracking_employee_id = props.body.employeeId;
  }
  // Date range filter — build DateTimeFilter manually without `as`
  if (props.body.date_from !== undefined || props.body.date_to !== undefined) {
    where.date = {
      ...(props.body.date_from !== undefined
        ? { gte: props.body.date_from }
        : {}),
      ...(props.body.date_to !== undefined ? { lte: props.body.date_to } : {}),
    } satisfies Prisma.DateTimeFilter;
  }
  // Project filter
  if (props.body.projectId !== undefined) {
    where.hrm_time_tracking_project_id = props.body.projectId;
  }
  // Task filter
  if (props.body.taskId !== undefined) {
    where.hrm_time_tracking_task_id = props.body.taskId;
  }
  // Billable filter
  if (props.body.billable !== undefined) {
    where.billable = props.body.billable;
  }
  // Search (description contains, case-insensitive)
  if (props.body.search !== undefined && props.body.search.length > 0) {
    where.description = {
      contains: props.body.search,
      mode: "insensitive",
    } satisfies Prisma.StringNullableFilter;
  }
  // 4. Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 5. Sorting — default to date descending
  const sortField = props.body.sort ?? "date";
  const sortDirection = props.body.direction ?? "desc";
  const orderBy: Prisma.hrm_time_tracking_timelogsOrderByWithRelationInput = {
    [sortField]: sortDirection,
  } satisfies Prisma.hrm_time_tracking_timelogsOrderByWithRelationInput;
  // 6. Execute queries (sequential: count first, then findMany)
  const total = await MyGlobal.prisma.hrm_time_tracking_timelogs.count({
    where,
  });
  const records = await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...HrmTimeTrackingTimelogAtSummaryTransformer.select(),
  });
  // 7. Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingTimelogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
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
// import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
// import { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
// import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberTimelogs(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingTimelog.IRequest;
// }): Promise<IPageIHrmTimeTrackingTimelog.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
//     ...HrmTimeTrackingTimelogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingTimelogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------