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

export async function patchHrmMemberRoles(props: {
  member: MemberPayload;
  body: IHrmRole.IRequest;
}): Promise<IPageIHrmRole.ISummary> {
  // Validate organization exists
  const organization = await MyGlobal.prisma.hrm_organizations.findFirst({
    where: {
      id: props.body.organization_id,
      deleted_at: null,
    },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // Build where clause with filters
  const whereInput: Prisma.hrm_rolesWhereInput = {
    hrm_organization_id: props.body.organization_id,
    deleted_at: null,
    ...(props.body.name !== undefined &&
      props.body.name !== null &&
      props.body.name !== "" && {
        name: {
          contains: props.body.name,
          mode: "insensitive",
        },
      }),
    ...(props.body.is_builtin !== undefined &&
      props.body.is_builtin !== null && {
        is_builtin: props.body.is_builtin,
      }),
  };
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 100;
  const safeLimit = limit === 0 ? 100 : Math.min(limit, 100);
  const skip = (page - 1) * safeLimit;
  // Execute findMany with pagination
  const records = await MyGlobal.prisma.hrm_roles.findMany({
    where: whereInput,
    skip,
    take: safeLimit,
    orderBy: { created_at: "desc" as const },
    ...HrmRoleAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.hrm_roles.count({
    where: whereInput,
  });
  // Transform records to DTOs
  const data = await ArrayUtil.asyncMap(
    records,
    HrmRoleAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    } satisfies IPage.IPagination,
    data,
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
// export async function patchHrmMemberRoles(props: {
//   member: MemberPayload;
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