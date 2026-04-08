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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const offset = (page - 1) * limit;
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      expired_at: { gt: new Date() },
      hrm_platform_member_id: props.member.id,
    },
  });
  if (session === null) {
    throw new HttpException("Session not found", 404);
  }
  const organization_id = session.hrm_platform_member_id;
  const where: Prisma.hrm_platform_rolesWhereInput = {
    deleted_at: null,
    organization_id,
    ...(props.body.name !== undefined
      ? { name: { startsWith: props.body.name } }
      : {}),
    ...(props.body.role_kind !== undefined
      ? { role_kind: props.body.role_kind }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            { name: { contains: props.body.search, mode: "insensitive" } },
            {
              description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.hrm_platform_rolesWhereInput;
  const orderBy: Prisma.hrm_platform_rolesOrderByWithRelationInput = {
    [props.body.sort ?? "created_at"]: props.body.order ?? "desc",
  } satisfies Prisma.hrm_platform_rolesOrderByWithRelationInput;
  const total = await MyGlobal.prisma.hrm_platform_roles.count({
    where,
  });
  const records = await MyGlobal.prisma.hrm_platform_roles.findMany({
    where,
    orderBy,
    skip: offset,
    take: limit,
    ...HrmPlatformRoleAtSummaryTransformer.select(),
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformRoleAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmPlatformRole.ISummary;
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