import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmEmployeeAtSummaryTransformer } from "../transformers/HrmEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberOrganizationsOrganizationCodeEmployees(props: {
  member: MemberPayload;
  organizationCode: string;
  body: IHrmEmployee.IRequest;
}): Promise<IPageIHrmEmployee.ISummary> {
  // Validate organization exists
  const organization = await MyGlobal.prisma.hrm_organizations.findFirst({
    where: {
      id: props.organizationCode,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!organization) {
    throw new HttpException("Organization not found", 404);
  }
  // Validate pagination parameters
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (pageSize < 1 || pageSize > 100) {
    throw new HttpException("Page size must be between 1 and 100", 400);
  }
  const skip = (page - 1) * pageSize;
  // Build where clause
  const where: Prisma.hrm_employeesWhereInput = {
    organization_id: props.organizationCode,
    deleted_at: null,
  };
  // Apply optional filters
  if (props.body.department_id !== undefined) {
    where.department_id = props.body.department_id;
  }
  if (props.body.employment_type !== undefined) {
    where.employment_type = props.body.employment_type;
  }
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  // Note: search filter removed - display_name field does not exist on hrm_members table
  // Get paginated records
  const records = await MyGlobal.prisma.hrm_employees.findMany({
    where,
    skip,
    take: pageSize,
    orderBy: { created_at: "desc" },
    ...HrmEmployeeAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.hrm_employees.count({
    where,
  });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    HrmEmployeeAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  } satisfies IPageIHrmEmployee.ISummary;
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
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IPageIHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmEmployee";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberOrganizationsOrganizationCodeEmployees(props: {
//   member: MemberPayload;
//   organizationCode: string;
//   body: IHrmEmployee.IRequest;
// }): Promise<IPageIHrmEmployee.ISummary> {
//   const records = await MyGlobal.prisma.hrm_employees.findMany({
//     ...HrmEmployeeAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmEmployeeAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------