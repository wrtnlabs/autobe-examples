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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { EcommerceMallGuestSessionAtSummaryTransformer } from "../transformers/EcommerceMallGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallGuestGuestSessions(props: {
  guest: GuestPayload;
  body: IEcommerceMallGuestSession.IRequest;
}): Promise<IPageIEcommerceMallGuestSession.ISummary> {
  const page = props.body.page ?? (1 as const);
  const limit = props.body.limit ?? (20 as const);
  const skip = (page - 1) * limit;
  // Get current timestamp as ISO string for expired comparisons
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Build WHERE conditions using ISO strings (Prisma accepts strings for DateTime comparisons)
  const whereInput = {
    ...(props.body.guestId !== undefined && {
      ecommerce_mall_guest_id: props.body.guestId,
    }),
    ...(props.body.ip !== undefined && {
      ip: { contains: props.body.ip },
    }),
    ...(props.body.href !== undefined && {
      href: { contains: props.body.href },
    }),
    ...(props.body.referrer !== undefined && {
      referrer: { contains: props.body.referrer },
    }),
    ...(props.body.dateFrom !== undefined || props.body.dateTo !== undefined
      ? {
          created_at: {
            ...(props.body.dateFrom !== undefined && {
              gte: props.body.dateFrom,
            }),
            ...(props.body.dateTo !== undefined && { lte: props.body.dateTo }),
          },
        }
      : {}),
    ...(props.body.expiredFrom !== undefined ||
    props.body.expiredTo !== undefined
      ? {
          expired_at: {
            ...(props.body.expiredFrom !== undefined && {
              gte: props.body.expiredFrom,
            }),
            ...(props.body.expiredTo !== undefined && {
              lte: props.body.expiredTo,
            }),
          },
        }
      : {}),
    ...(props.body.expired !== undefined && {
      expired_at: props.body.expired ? { lt: now } : { gte: now },
    }),
  } satisfies Prisma.ecommerce_mall_guest_sessionsWhereInput;
  // Sorting
  const sortBy = props.body.sortBy ?? "created_at";
  const orderBy = {
    [sortBy]: "desc" as const,
  } satisfies Prisma.ecommerce_mall_guest_sessionsOrderByWithRelationInput;
  // Query database
  const records = await MyGlobal.prisma.ecommerce_mall_guest_sessions.findMany({
    ...EcommerceMallGuestSessionAtSummaryTransformer.select(),
    where: whereInput,
    orderBy: [orderBy],
    skip,
    take: limit,
  });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_mall_guest_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
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
// export async function patchEcommerceMallGuestGuestSessions(props: {
//   guest: GuestPayload;
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