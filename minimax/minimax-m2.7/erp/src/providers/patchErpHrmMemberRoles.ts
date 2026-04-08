import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmRoleAtSummaryTransformer } from "../transformers/ErpHrmRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberRoles(props: {
  member: MemberPayload;
  body: IErpHrmRole.IRequest;
}): Promise<IPageIErpHrmRole.ISummary> {
  // Look up the member's employee record to get organization context
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      erp_hrm_organization_id: true,
    },
  });
  const organizationId = employee?.erp_hrm_organization_id;
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereClause = {
    erp_hrm_organization_id: organizationId,
    deleted_at: null,
    ...(props.body.name !== undefined && {
      name: { contains: props.body.name, mode: "insensitive" as const },
    }),
    ...(props.body.isBuiltin !== undefined && {
      is_builtin: props.body.isBuiltin,
    }),
  } satisfies Prisma.erp_hrm_rolesWhereInput;
  // Query roles with pagination
  const records = await MyGlobal.prisma.erp_hrm_roles.findMany({
    where: whereClause,
    orderBy: [{ is_builtin: "desc" }, { created_at: "asc" }],
    skip,
    take: limit,
    ...ErpHrmRoleAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.erp_hrm_roles.count({
    where: whereClause,
  });
  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ErpHrmRoleAtSummaryTransformer.transform,
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
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberRoles(props: {
//   member: MemberPayload;
//   body: IErpHrmRole.IRequest;
// }): Promise<IPageIErpHrmRole.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_roles.findMany({
//     ...ErpHrmRoleAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmRoleAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------