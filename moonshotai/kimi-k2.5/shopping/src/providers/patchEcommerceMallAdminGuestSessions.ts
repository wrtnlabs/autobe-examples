import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallGuestSessionAtSummaryTransformer } from "../transformers/EcommerceMallGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminGuestSessions(props: {
  admin: AdminPayload;
  body: IEcommerceMallGuestSession.IRequest;
}): Promise<IPageIEcommerceMallGuestSession.ISummary> {
  // Build date range filters
  const createdAtFilter: Prisma.DateTimeFilter | undefined =
    (props.body.createdAtFrom !== null &&
      props.body.createdAtFrom !== undefined) ||
    (props.body.createdAtTo !== null && props.body.createdAtTo !== undefined)
      ? {
          ...(props.body.createdAtFrom !== null &&
            props.body.createdAtFrom !== undefined && {
              gte: new Date(props.body.createdAtFrom),
            }),
          ...(props.body.createdAtTo !== null &&
            props.body.createdAtTo !== undefined && {
              lte: new Date(props.body.createdAtTo),
            }),
        }
      : undefined;
  const expiredAtFilter: Prisma.DateTimeFilter | undefined =
    (props.body.expiredAtFrom !== null &&
      props.body.expiredAtFrom !== undefined) ||
    (props.body.expiredAtTo !== null && props.body.expiredAtTo !== undefined)
      ? {
          ...(props.body.expiredAtFrom !== null &&
            props.body.expiredAtFrom !== undefined && {
              gte: new Date(props.body.expiredAtFrom),
            }),
          ...(props.body.expiredAtTo !== null &&
            props.body.expiredAtTo !== undefined && {
              lte: new Date(props.body.expiredAtTo),
            }),
        }
      : undefined;
  // Build where clause with all filters
  const where: Prisma.ecommerce_mall_guest_sessionsWhereInput = {
    ...(props.body.ip !== null &&
      props.body.ip !== undefined && { ip: { contains: props.body.ip } }),
    ...(props.body.referrer !== null &&
      props.body.referrer !== undefined && {
        referrer: { contains: props.body.referrer },
      }),
    ...(props.body.href !== null &&
      props.body.href !== undefined && { href: { contains: props.body.href } }),
    ...(props.body.guestId !== null &&
      props.body.guestId !== undefined && {
        ecommerce_mall_guest_id: props.body.guestId,
      }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(expiredAtFilter !== undefined && { expired_at: expiredAtFilter }),
  };
  // Pagination settings
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sorting
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Fetch records and total count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_guest_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      ...EcommerceMallGuestSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_guest_sessions.count({ where }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallGuestSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
// import { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminGuestSessions(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallGuestSession.IRequest;
// }): Promise<IPageIEcommerceMallGuestSession.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_guest_sessions.findMany({
//     ...EcommerceMallGuestSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallGuestSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------