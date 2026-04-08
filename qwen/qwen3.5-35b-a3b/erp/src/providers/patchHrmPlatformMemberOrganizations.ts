import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationAtSummaryTransformer } from "../transformers/HrmPlatformOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmPlatformOrganization.IRequest;
}): Promise<IPageIHrmPlatformOrganization.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_organizationsWhereInput = {
    owner_id: props.member.id,
    deleted_at: null,
    ...(props.body.search !== undefined
      ? { name: { contains: props.body.search, mode: "insensitive" } }
      : {}),
    ...(props.body.currency !== undefined
      ? { currency: props.body.currency }
      : {}),
    ...(props.body.fiscal_start_month !== undefined
      ? { fiscal_start_month: props.body.fiscal_start_month }
      : {}),
  };
  const orderByInput: Prisma.hrm_platform_organizationsOrderByWithRelationInput =
    (() => {
      switch (props.body.sort) {
        case "created_at_asc":
          return { created_at: "asc" };
        case "name_asc":
          return { name: "asc" };
        case "fiscal_start_month":
          return { fiscal_start_month: "asc" };
        case "created_at_desc":
        default:
          return { created_at: "desc" };
      }
    })();
  const records = await MyGlobal.prisma.hrm_platform_organizations.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...HrmPlatformOrganizationAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_organizations.count({
    where: whereInput,
  });
  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformOrganizationAtSummaryTransformer.transform,
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
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberOrganizations(props: {
//   member: MemberPayload;
//   body: IHrmPlatformOrganization.IRequest;
// }): Promise<IPageIHrmPlatformOrganization.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_organizations.findMany({
//     ...HrmPlatformOrganizationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformOrganizationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------