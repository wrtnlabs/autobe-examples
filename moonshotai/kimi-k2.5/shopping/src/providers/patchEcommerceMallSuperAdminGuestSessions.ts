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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallGuestSessionAtSummaryTransformer } from "../transformers/EcommerceMallGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminGuestSessions(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallGuestSession.IRequest;
}): Promise<IPageIEcommerceMallGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const createdAtWhere: Prisma.DateTimeFilter | undefined =
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtFrom !== null &&
    props.body.createdAtTo !== undefined &&
    props.body.createdAtTo !== null
      ? {
          gte: new Date(props.body.createdAtFrom),
          lte: new Date(props.body.createdAtTo),
        }
      : props.body.createdAtFrom !== undefined &&
          props.body.createdAtFrom !== null
        ? { gte: new Date(props.body.createdAtFrom) }
        : props.body.createdAtTo !== undefined &&
            props.body.createdAtTo !== null
          ? { lte: new Date(props.body.createdAtTo) }
          : undefined;
  const expiredAtWhere: Prisma.DateTimeFilter | undefined =
    props.body.expiredAtFrom !== undefined &&
    props.body.expiredAtFrom !== null &&
    props.body.expiredAtTo !== undefined &&
    props.body.expiredAtTo !== null
      ? {
          gte: new Date(props.body.expiredAtFrom),
          lte: new Date(props.body.expiredAtTo),
        }
      : props.body.expiredAtFrom !== undefined &&
          props.body.expiredAtFrom !== null
        ? { gte: new Date(props.body.expiredAtFrom) }
        : props.body.expiredAtTo !== undefined &&
            props.body.expiredAtTo !== null
          ? { lte: new Date(props.body.expiredAtTo) }
          : undefined;
  const where: Prisma.ecommerce_mall_guest_sessionsWhereInput = {
    ...(props.body.ip !== undefined &&
      props.body.ip !== null && {
        ip: { contains: props.body.ip, mode: "insensitive" as const },
      }),
    ...(props.body.referrer !== undefined &&
      props.body.referrer !== null && {
        referrer: {
          contains: props.body.referrer,
          mode: "insensitive" as const,
        },
      }),
    ...(props.body.href !== undefined &&
      props.body.href !== null && {
        href: { contains: props.body.href, mode: "insensitive" as const },
      }),
    ...(props.body.guestId !== undefined &&
      props.body.guestId !== null && {
        ecommerce_mall_guest_id: props.body.guestId,
      }),
    ...(createdAtWhere !== undefined && { created_at: createdAtWhere }),
    ...(expiredAtWhere !== undefined && { expired_at: expiredAtWhere }),
  };
  const orderBy: Prisma.ecommerce_mall_guest_sessionsOrderByWithRelationInput =
    props.body.sortBy === "expired_at"
      ? { expired_at: props.body.sortOrder ?? "desc" }
      : { created_at: props.body.sortOrder ?? "desc" };
  const records = await MyGlobal.prisma.ecommerce_mall_guest_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallGuestSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_guest_sessions.count({
    where,
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
      EcommerceMallGuestSessionAtSummaryTransformer.transform,
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
// import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
// import { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminGuestSessions(props: {
//   superAdmin: SuperadminPayload;
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