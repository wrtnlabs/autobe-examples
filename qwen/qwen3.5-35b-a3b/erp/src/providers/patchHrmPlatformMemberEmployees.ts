import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberEmployees(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployee.IRequest;
}): Promise<IPageIHrmPlatformEmployee.ISummary> {
  // Get session to determine organization context
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
    },
  });
  if (session === null) {
    throw new HttpException("Forbidden", 403);
  }
  const organizationId = session.organization_id;
  // Build where clause with organization scoping and soft-delete exclusion
  const whereClause: Prisma.hrm_platform_employeesWhereInput = {
    hrm_platform_organization_id: organizationId!,
    deleted_at: null,
  };
  // Apply filters from request body
  if (props.body.status !== undefined) {
    whereClause.status = props.body.status;
  }
  if (props.body.department_id !== undefined) {
    whereClause.hrm_platform_department_id = props.body.department_id;
  }
  if (props.body.employee_code !== undefined) {
    whereClause.employee_code = {
      contains: props.body.employee_code,
      mode: "insensitive",
    };
  }
  if (props.body.display_name !== undefined) {
    whereClause.display_name = {
      contains: props.body.display_name,
      mode: "insensitive",
    };
  }
  if (props.body.email !== undefined) {
    whereClause.email = {
      contains: props.body.email,
      mode: "insensitive",
    };
  }
  if (props.body.job_level !== undefined) {
    whereClause.job_level = props.body.job_level;
  }
  if (props.body.employment_type !== undefined) {
    whereClause.employment_type = props.body.employment_type;
  }
  if (
    props.body.start_date_gte !== undefined ||
    props.body.start_date_lte !== undefined
  ) {
    whereClause.start_date = {};
    if (props.body.start_date_gte !== undefined) {
      whereClause.start_date.gte = new Date(props.body.start_date_gte);
    }
    if (props.body.start_date_lte !== undefined) {
      whereClause.start_date.lte = new Date(props.body.start_date_lte);
    }
  }
  if (props.body.is_pending !== undefined) {
    whereClause.is_pending = props.body.is_pending;
  }
  // Build order by clause
  const sortField = props.body.sort ?? "updated_at";
  const orderByClause = {
    [sortField]: "desc",
  } satisfies Prisma.hrm_platform_employeesOrderByWithRelationInput;
  // Calculate pagination with validation
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Ensure page is at least 1
  const validPage = page < 1 ? 1 : page;
  // Ensure limit is within bounds (1-100)
  const validLimit = limit < 1 ? 1 : limit > 100 ? 100 : limit;
  const skip = (validPage - 1) * validLimit;
  // Query total count
  const total = await MyGlobal.prisma.hrm_platform_employees.count({
    where: whereClause,
  });
  // Query employee records
  const records = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where: whereClause,
    orderBy: orderByClause,
    skip,
    take: validLimit,
    ...HrmPlatformEmployeeAtSummaryTransformer.select(),
  });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    HrmPlatformEmployeeAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    pagination: {
      current: validPage,
      limit: validLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / validLimit),
    },
    data,
  } satisfies IPageIHrmPlatformEmployee.ISummary;
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
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberEmployees(props: {
//   member: MemberPayload;
//   body: IHrmPlatformEmployee.IRequest;
// }): Promise<IPageIHrmPlatformEmployee.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_employees.findMany({
//     ...HrmPlatformEmployeeAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformEmployeeAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------