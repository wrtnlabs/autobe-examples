import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetAtSummaryTransformer } from "../transformers/ErpHrmTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimesheet.IRequest;
}): Promise<IPageIErpHrmTimesheet.ISummary> {
  // Get current member's employee record with role and permissions
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
      role: {
        select: {
          rolePermissions: {
            select: {
              permission: true,
            },
          },
        },
      },
    },
  });
  // Check if member has time:approve permission
  const hasTimeApprovePermission = employee.role.rolePermissions.some(
    (p) => p.permission === "time:approve",
  );
  // Build WHERE clause
  const whereClause: Prisma.erp_hrm_timesheetsWhereInput = {
    deleted_at: null,
    employee: {
      erp_hrm_organization_id: employee.erp_hrm_organization_id,
      deleted_at: null,
    },
  };
  // Apply status filter if provided
  if (props.body.status !== undefined) {
    whereClause.status = props.body.status;
  }
  // Apply weekStartDate range filter if provided
  if (props.body.weekStartDate !== undefined) {
    whereClause.week_start_date = {};
    if (props.body.weekStartDate.gte !== undefined) {
      whereClause.week_start_date.gte = props.body.weekStartDate.gte;
    }
    if (props.body.weekStartDate.lte !== undefined) {
      whereClause.week_start_date.lte = props.body.weekStartDate.lte;
    }
  }
  // Scope to current employee if no time:approve permission
  if (!hasTimeApprovePermission) {
    whereClause.erp_hrm_employee_id = employee.id;
  } else if (props.body.employeeId !== undefined) {
    // If has permission and employeeId filter provided, scope to that employee
    whereClause.erp_hrm_employee_id = props.body.employeeId;
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Execute queries sequentially (not parallel)
  const records = await MyGlobal.prisma.erp_hrm_timesheets.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmTimesheetAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_timesheets.count({
    where: whereClause,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ErpHrmTimesheetAtSummaryTransformer.transform,
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
// import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
// import { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberTimesheets(props: {
//   member: MemberPayload;
//   body: IErpHrmTimesheet.IRequest;
// }): Promise<IPageIErpHrmTimesheet.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_timesheets.findMany({
//     ...ErpHrmTimesheetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmTimesheetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------