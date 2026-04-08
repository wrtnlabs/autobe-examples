import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRoleAtSummaryTransformer } from "../transformers/HrmPlatformRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberRoles(props: {
  member: MemberPayload;
  body: IHrmPlatformRole.IRequest;
}): Promise<IPageIHrmPlatformRole.ISummary> {
  // Resolve organization context from session
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { organization_id: true },
    });
  // Parse and validate pagination with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be greater than or equal to 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereInput: Prisma.hrm_platform_rolesWhereInput = {
    organization_id: session.organization_id!,
    deleted_at: null,
    ...(props.body.name && { name: { startsWith: props.body.name } }),
    ...(props.body.role_kind && { role_kind: props.body.role_kind }),
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  };
  // Build order by clause
  const orderDirection: "asc" | "desc" = props.body.order ?? "desc";
  const orderByInput: Prisma.hrm_platform_rolesOrderByWithRelationInput =
    props.body.sort === "name"
      ? { name: orderDirection }
      : props.body.sort === "created_at"
        ? { created_at: orderDirection }
        : props.body.sort === "updated_at"
          ? { updated_at: orderDirection }
          : { created_at: "desc" };
  // Query roles with transformer
  const records = await MyGlobal.prisma.hrm_platform_roles.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...HrmPlatformRoleAtSummaryTransformer.select(),
  });
  // Query total count
  const total = await MyGlobal.prisma.hrm_platform_roles.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.max(0, Math.ceil(total / limit)),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformRoleAtSummaryTransformer.transform,
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
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberRoles(props: {
//   member: MemberPayload;
//   body: IHrmPlatformRole.IRequest;
// }): Promise<IPageIHrmPlatformRole.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_roles.findMany({
//     ...HrmPlatformRoleAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformRoleAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------