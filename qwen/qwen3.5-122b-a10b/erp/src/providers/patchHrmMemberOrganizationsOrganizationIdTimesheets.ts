import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimesheetTimelogAtSummaryTransformer } from "../transformers/HrmTimesheetTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberOrganizationsOrganizationIdTimesheets(props: {
  member: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimesheetTimelog.IRequest;
}): Promise<IPageIHrmTimesheetTimelog.ISummary> {
  // Verify organization exists
  const organization = await MyGlobal.prisma.hrm_organizations.findFirst({
    where: { id: props.organizationId, deleted_at: null },
  });
  if (!organization) {
    throw new HttpException("Organization not found", 404);
  }
  // Get user's employee record in this organization with role and permissions
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      role: {
        select: {
          rolePermissions: {
            select: {
              hrmPermission: {
                select: {
                  permission_name: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!employee) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Check permissions
  const hasTimeViewAll = employee.role.rolePermissions.some(
    (rp) => rp.hrmPermission.permission_name === "time:view-all",
  );
  const hasTimeApprove = employee.role.rolePermissions.some(
    (rp) => rp.hrmPermission.permission_name === "time:approve",
  );
  // Get all employee IDs in this organization
  const employeeIds = await MyGlobal.prisma.hrm_employees.findMany({
    where: {
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const employeeIdList = employeeIds.map((e) => e.id);
  // Build where clause for timesheets in this organization
  const where: Prisma.hrm_timesheetsWhereInput = {
    hrm_employee_id: {
      in: employeeIdList,
    },
    deleted_at: null,
  };
  // If user doesn't have time:view-all or time:approve, filter to their own timesheets
  if (!hasTimeViewAll && !hasTimeApprove) {
    where.hrm_employee_id = employee.id;
  }
  // Apply status filter
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  // Apply date range filters
  if (
    props.body.week_start_date_gte !== undefined ||
    props.body.week_start_date_lte !== undefined
  ) {
    const dateFilters: Prisma.DateTimeFilter = {};
    if (props.body.week_start_date_gte !== undefined) {
      dateFilters.gte = new Date(props.body.week_start_date_gte);
    }
    if (props.body.week_start_date_lte !== undefined) {
      dateFilters.lte = new Date(props.body.week_start_date_lte);
    }
    where.week_start_date = dateFilters;
  }
  // Apply employee_id filter (overrides the permission-based filter if explicitly provided)
  if (props.body.employee_id !== undefined) {
    where.hrm_employee_id = props.body.employee_id;
  }
  // Pagination with defaults and limits
  const page: number = props.body.page ?? 1;
  const limit: number = Math.min(props.body.limit ?? 10, 100);
  const skip: number = (page - 1) * limit;
  // Query timesheets
  const records = await MyGlobal.prisma.hrm_timesheets.findMany({
    where,
    skip,
    take: limit,
    orderBy: { week_start_date: "desc" },
    ...HrmTimesheetTimelogAtSummaryTransformer.select(),
  });
  // Get total count
  const total: number = await MyGlobal.prisma.hrm_timesheets.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimesheetTimelogAtSummaryTransformer.transform,
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
// import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
// import { IPageIHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimesheetTimelog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberOrganizationsOrganizationIdTimesheets(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmTimesheetTimelog.IRequest;
// }): Promise<IPageIHrmTimesheetTimelog.ISummary> {
//   const records = await MyGlobal.prisma.hrm_timesheets.findMany({
//     ...HrmTimesheetTimelogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimesheetTimelogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------