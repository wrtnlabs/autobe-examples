import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimesheetAtSummaryTransformer } from "../transformers/HrmTimeTrackingTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimesheet.IRequest;
}): Promise<IPageIHrmTimeTrackingTimesheet.ISummary> {
  // Find the authenticated member's active employee record within an organization
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_role_id: true,
      hrm_time_tracking_organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found or deactivated", 403);
  }
  // Check if the employee's role includes the time:approve permission
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "time:approve",
        deleted_at: null,
      },
      select: { id: true },
    });
  const hasTimeApprove: boolean = permission !== null;
  // Build the where clause for timesheet filtering
  const where: Prisma.hrm_time_tracking_timesheetsWhereInput = {
    deleted_at: null,
  };
  if (hasTimeApprove) {
    // Manager/Admin with time:approve: can see any employee's timesheets within the organization
    if (props.body.employeeId !== undefined) {
      // Verify the target employee exists in the same organization
      const targetEmployee =
        await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
          where: {
            id: props.body.employeeId,
            hrm_time_tracking_organization_id:
              employee.hrm_time_tracking_organization_id,
            deleted_at: null,
          },
          select: { id: true },
        });
      if (targetEmployee === null) {
        throw new HttpException("Employee not found in your organization", 404);
      }
      where.hrm_time_tracking_employee_id = props.body.employeeId;
    }
  } else {
    // Regular employee: can only see their own timesheets
    where.hrm_time_tracking_employee_id = employee.id;
  }
  // Status filter (exact match)
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  // Week start date range filter (ISO strings passed directly, no Date objects)
  if (props.body.startDate !== undefined || props.body.endDate !== undefined) {
    where.week_start_date = {
      ...(props.body.startDate !== undefined && { gte: props.body.startDate }),
      ...(props.body.endDate !== undefined && { lte: props.body.endDate }),
    } satisfies Prisma.DateTimeFilter;
  }
  // Pagination defaults
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Sequential queries (findMany then count) — NOT Promise.all
  const records = await MyGlobal.prisma.hrm_time_tracking_timesheets.findMany({
    where,
    skip,
    take: limit,
    orderBy: { week_start_date: "desc" },
    ...HrmTimeTrackingTimesheetAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_timesheets.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingTimesheetAtSummaryTransformer.transform,
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
// import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
// import { IPageIHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheet";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberTimesheets(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingTimesheet.IRequest;
// }): Promise<IPageIHrmTimeTrackingTimesheet.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_timesheets.findMany({
//     ...HrmTimeTrackingTimesheetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingTimesheetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------