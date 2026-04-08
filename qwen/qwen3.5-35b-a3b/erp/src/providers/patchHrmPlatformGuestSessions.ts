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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformGuestSessions(props: {
  guest: GuestPayload;
  body: IHrmPlatformMemberSession.IRequest;
}): Promise<IPageIHrmPlatformMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const now = new Date();
  const guestSession =
    await MyGlobal.prisma.hrm_platform_guest_sessions.findFirst({
      where: {
        id: props.guest.session_id,
        expired_at: { gt: now },
        hrm_platform_guest_id: props.guest.id,
      },
      select: {
        id: true,
      },
    });
  if (guestSession === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const filters: Prisma.hrm_platform_member_sessionsWhereInput = {};
  if (props.body.search) {
    filters.OR = [
      { ip_address: { contains: props.body.search } },
      {
        user_agent: {
          contains: props.body.search,
          mode: "insensitive" as "insensitive",
        },
      },
    ];
  }
  if (props.body.ip_address) {
    filters.ip_address = { contains: props.body.ip_address };
  }
  if (props.body.user_agent) {
    filters.user_agent = {
      contains: props.body.user_agent,
      mode: "insensitive" as "insensitive",
    };
  }
  if (props.body.organization_id !== undefined) {
    filters.organization_id =
      props.body.organization_id === null ? null : props.body.organization_id;
  }
  if (props.body.status === "active") {
    filters.access_token_expires_at = { gt: now };
  } else if (props.body.status === "expired") {
    filters.access_token_expires_at = { lte: now };
  }
  const sortOrder: Prisma.SortOrder =
    props.body.order === "ASC"
      ? "asc"
      : props.body.order === "DESC"
        ? "desc"
        : "desc";
  const orderByInput =
    props.body.sort === "access_token_expires_at"
      ? { access_token_expires_at: sortOrder }
      : props.body.sort === "refresh_token_expires_at"
        ? { refresh_token_expires_at: sortOrder }
        : { created_at: sortOrder };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_member_sessions.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.hrm_platform_member_sessions.count({
      where: filters,
    }),
  ]);
  const data = await ArrayUtil.asyncMap(records, async (record) => {
    return {
      id: record.id,
      ip_address: record.ip_address,
      user_agent: record.user_agent,
      created_at: toISOStringSafe(record.created_at),
      expired_at: record.expired_at ? toISOStringSafe(record.expired_at) : null,
      organization: null,
    } satisfies IHrmPlatformMemberSession.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
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