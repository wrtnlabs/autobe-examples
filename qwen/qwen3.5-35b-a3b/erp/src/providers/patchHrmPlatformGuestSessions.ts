import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { HrmPlatformMemberSessionAtSummaryTransformer } from "../transformers/HrmPlatformMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformGuestSessions(props: {
  guest: GuestPayload;
  body: IHrmPlatformMemberSession.IRequest;
}): Promise<IPageIHrmPlatformMemberSession.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const now: Date = new Date();
  const whereInput: Prisma.hrm_platform_member_sessionsWhereInput = {
    hrm_platform_member_id: props.guest.id,
    ...(props.body.ip_address !== undefined && {
      ip_address: { contains: props.body.ip_address },
    }),
    ...(props.body.user_agent !== undefined && {
      user_agent: { contains: props.body.user_agent },
    }),
    ...(props.body.organization_id !== undefined &&
      props.body.organization_id !== null && {
        organization: { id: props.body.organization_id },
      }),
    ...(props.body.status === "active" && { expired_at: { gt: now } }),
    ...(props.body.status === "expired" && { expired_at: { lte: now } }),
  } satisfies Prisma.hrm_platform_member_sessionsWhereInput;
  const orderByInput: Prisma.hrm_platform_member_sessionsOrderByWithRelationInput =
    props.body.sort === "access_token_expires_at"
      ? { access_token_expires_at: props.body.order === "ASC" ? "asc" : "desc" }
      : props.body.sort === "refresh_token_expires_at"
        ? {
            refresh_token_expires_at:
              props.body.order === "ASC" ? "asc" : "desc",
          }
        : { created_at: props.body.order === "ASC" ? "asc" : "desc" };
  const data = await MyGlobal.prisma.hrm_platform_member_sessions.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformMemberSessionAtSummaryTransformer.select(),
  });
  const total: number =
    await MyGlobal.prisma.hrm_platform_member_sessions.count({
      where: whereInput,
    });
  const transformed: Array<IHrmPlatformMemberSession.ISummary> =
    await ArrayUtil.asyncMap(
      data,
      HrmPlatformMemberSessionAtSummaryTransformer.transform,
    );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  } satisfies IPageIHrmPlatformMemberSession.ISummary;
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
// import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
// import { IPageIHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformGuestSessions(props: {
//   guest: GuestPayload;
//   body: IHrmPlatformMemberSession.IRequest;
// }): Promise<IPageIHrmPlatformMemberSession.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_member_sessions.findMany({
//     ...HrmPlatformMemberSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformMemberSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------