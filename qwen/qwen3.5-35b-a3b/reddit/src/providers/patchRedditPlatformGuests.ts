import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformGuest";
import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformGuestAtSummaryTransformer } from "../transformers/RedditPlatformGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformGuests(props: {
  body: IRedditPlatformGuest.IRequest;
}): Promise<IPageIRedditPlatformGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base where clause
  const whereInput: Prisma.reddit_platform_guestsWhereInput = {
    ...(props.body.deleted_at === "not_null" && { deleted_at: { not: null } }),
    ...(props.body.deleted_at === "null" && { deleted_at: null }),
    ...(props.body.fingerprint_prefix !== undefined && {
      fingerprint: { startsWith: props.body.fingerprint_prefix },
    }),
    ...(props.body.created_at_gte !== undefined && {
      created_at: { gte: props.body.created_at_gte },
    }),
    ...(props.body.created_at_lte !== undefined && {
      created_at: { lte: props.body.created_at_lte },
    }),
    ...(props.body.updated_at_gte !== undefined && {
      updated_at: { gte: props.body.updated_at_gte },
    }),
    ...(props.body.updated_at_lte !== undefined && {
      updated_at: { lte: props.body.updated_at_lte },
    }),
    ...(props.body.deleted_at_gte !== undefined && {
      deleted_at: { not: null, gte: props.body.deleted_at_gte },
    }),
    ...(props.body.deleted_at_lte !== undefined && {
      deleted_at: { not: null, lte: props.body.deleted_at_lte },
    }),
  } satisfies Prisma.reddit_platform_guestsWhereInput;
  // Add session_status filter
  const sessionFilter = props.body.session_status;
  if (sessionFilter === "active") {
    (whereInput as any).guestSessions = {
      some: {
        OR: [{ expired_at: { is: null } }, { expired_at: { gt: new Date() } }],
      },
    };
  } else if (sessionFilter === "inactive") {
    (whereInput as any).guestSessions = {
      none: {
        expired_at: { is: null },
      },
    };
  }
  const sort_by = props.body.sort_by ?? "created_at";
  const sort_order = props.body.sort_order ?? "desc";
  const orderByInput = {
    [sort_by]: sort_order,
  } satisfies Prisma.reddit_platform_guestsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.reddit_platform_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_guests.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditPlatformGuestAtSummaryTransformer.transform,
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
// import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
// import { IPageIRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformGuest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformGuests(props: {
//   body: IRedditPlatformGuest.IRequest;
// }): Promise<IPageIRedditPlatformGuest.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_guests.findMany({
//     ...RedditPlatformGuestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformGuestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------