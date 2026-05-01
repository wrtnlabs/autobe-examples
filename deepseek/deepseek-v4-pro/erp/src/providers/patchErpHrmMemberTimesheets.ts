import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
  // Resolve session and organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  const organizationId: string = session.erp_hrm_organization_id;
  // Find the employee record for this member in the current organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: {
      erp_hrm_member_id_erp_hrm_organization_id: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: organizationId,
      },
    },
    select: {
      id: true,
      role: {
        select: {
          name: true,
          is_builtin: true,
          rolePermissions: {
            select: {
              permission: {
                select: { key: true },
              },
            },
          },
        },
      },
    },
  });
  // Determine if the member has elevated timesheet viewing permissions
  const isBuiltinElevated: boolean =
    employee.role.is_builtin === true &&
    (employee.role.name === "Owner" || employee.role.name === "Manager");
  const hasTimeViewAllOrApprove: boolean = employee.role.rolePermissions.some(
    (rp) =>
      rp.permission.key === "time:view_all" ||
      rp.permission.key === "time:approve",
  );
  const canViewAll: boolean = isBuiltinElevated || hasTimeViewAllOrApprove;
  // Authorization scoping for employeeId filter
  if (props.body.employeeId !== undefined && !canViewAll) {
    if (props.body.employeeId !== employee.id) {
      throw new HttpException(
        "You don't have permission to view other employees' timesheets",
        403,
      );
    }
  }
  // Build where conditions
  const whereConditions: Prisma.erp_hrm_timesheetsWhereInput[] = [
    { deleted_at: null },
  ];
  // Scope: regular employees see only their own timesheets
  if (canViewAll && props.body.employeeId !== undefined) {
    whereConditions.push({ employee_id: props.body.employeeId });
  } else if (!canViewAll) {
    whereConditions.push({ employee_id: employee.id });
  }
  // Status filter
  if (props.body.status !== undefined && props.body.status.length > 0) {
    whereConditions.push({ status: { in: props.body.status } });
  }
  // Date range overlap filter
  if (props.body.dateRange !== undefined) {
    whereConditions.push({
      week_start_date: { lte: props.body.dateRange.end },
      week_end_date: { gte: props.body.dateRange.start },
    });
  }
  const where: Prisma.erp_hrm_timesheetsWhereInput = {
    AND: whereConditions,
  };
  // Parse sort parameter
  let orderBy: Prisma.erp_hrm_timesheetsOrderByWithRelationInput;
  if (props.body.sort !== undefined) {
    const parts: string[] = props.body.sort.trim().split(/\s+/);
    const field: string = parts[0];
    const dir: "asc" | "desc" =
      parts.length > 1 && parts[1].toLowerCase() === "asc" ? "asc" : "desc";
    switch (field) {
      case "id":
        orderBy = { id: dir };
        break;
      case "week_start_date":
        orderBy = { week_start_date: dir };
        break;
      case "status":
        orderBy = { status: dir };
        break;
      case "submitted_at":
        orderBy = { submitted_at: dir };
        break;
      case "created_at":
      default:
        orderBy = { created_at: dir };
        break;
    }
  } else {
    orderBy = { created_at: "desc" };
  }
  // Pagination
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Execute queries sequentially
  const data = await MyGlobal.prisma.erp_hrm_timesheets.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmTimesheetAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.erp_hrm_timesheets.count({
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
      data,
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