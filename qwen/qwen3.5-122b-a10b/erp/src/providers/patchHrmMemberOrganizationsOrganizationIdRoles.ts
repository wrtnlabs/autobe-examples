import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmRoleAtSummaryTransformer } from "../transformers/HrmRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberOrganizationsOrganizationIdRoles(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmRole.IRequest;
}): Promise<IPageIHrmRole.ISummary> {
  // Validate organization exists and is not deleted
  await MyGlobal.prisma.hrm_organizations.findUniqueOrThrow({
    where: { id: props.organizationId, deleted_at: null },
  });
  // Normalize pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? props.body.pageSize ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const whereInput: Prisma.hrm_rolesWhereInput = {
    hrm_organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.name !== undefined &&
      props.body.name !== null &&
      props.body.name !== "" && {
        name: { contains: props.body.name, mode: "insensitive" },
      }),
    ...(props.body.is_builtin !== undefined && {
      is_builtin: props.body.is_builtin,
    }),
  } satisfies Prisma.hrm_rolesWhereInput;
  // Query roles with pagination
  const records = await MyGlobal.prisma.hrm_roles.findMany({
    where: whereInput,
    orderBy: { name: "asc" },
    skip,
    take: limit,
    ...HrmRoleAtSummaryTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.hrm_roles.count({
    where: whereInput,
  });
  // Transform and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmRoleAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmRole.ISummary;
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
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IPageIHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmRole";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberOrganizationsOrganizationIdRoles(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmRole.IRequest;
// }): Promise<IPageIHrmRole.ISummary> {
//   const records = await MyGlobal.prisma.hrm_roles.findMany({
//     ...HrmRoleAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmRoleAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------