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

export async function patchHrmMemberOrganizationsOrganizationIdEmployees(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmEmployee.IRequest;
}): Promise<IPageIHrmEmployee.ISummary> {
  const organization = await MyGlobal.prisma.hrm_organizations.findUnique({
    where: { id: props.organizationId },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      organization_id: props.organizationId,
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  const whereInput: Prisma.hrm_employeesWhereInput = {
    organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.department_id !== undefined &&
    props.body.department_id !== null
      ? { department_id: props.body.department_id }
      : {}),
    ...(props.body.employment_type !== undefined &&
    props.body.employment_type !== null
      ? { employment_type: props.body.employment_type }
      : {}),
    ...(props.body.status !== undefined && props.body.status !== null
      ? { status: props.body.status }
      : {}),
  };
  const page = props.body.page ?? 1;
  const limit = Math.min(
    (props.body.pageSize ?? props.body.limit ?? 20) || 20,
    100,
  );
  const skip = (page - 1) * limit;
  const sortBy =
    props.body.sortBy !== undefined && props.body.sortBy !== null
      ? props.body.sortBy
      : "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const records = await MyGlobal.prisma.hrm_employees.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    ...HrmEmployeeAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_employees.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmEmployeeAtSummaryTransformer.transform,
    ),
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
// export async function patchHrmMemberOrganizationsOrganizationIdEmployees(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
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