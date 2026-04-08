import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformGuestSession";
import { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformGuestSessionAtSummaryTransformer } from "../transformers/RedditPlatformGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformGuestGuestSessions(props: {
  guest: GuestPayload;
  body: IRedditPlatformGuestSession.IRequest;
}): Promise<IPageIRedditPlatformGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereInput: Prisma.reddit_platform_guest_sessionsWhereInput = {
    ...(props.body.ip !== undefined && { ip: props.body.ip }),
    ...(props.body.createdAtBefore !== undefined && {
      created_at: { lt: props.body.createdAtBefore },
    }),
    ...(props.body.createdAtAfter !== undefined && {
      created_at: { gt: props.body.createdAtAfter },
    }),
    ...(props.body.expiredAtBefore !== undefined && {
      expired_at: { lt: props.body.expiredAtBefore },
    }),
    ...(props.body.expiredAtAfter !== undefined && {
      expired_at: { gt: props.body.expiredAtAfter },
    }),
    ...(props.body.referrer !== undefined && {
      referrer: { contains: props.body.referrer },
    }),
    ...(props.body.referrer !== undefined && { referrer: { not: null } }),
  };
  // Build orderBy based on sortBy
  const orderByInput: Prisma.reddit_platform_guest_sessionsOrderByWithRelationInput =
    props.body.sortBy === "createdAsc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  // Query records
  const records = await MyGlobal.prisma.reddit_platform_guest_sessions.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditPlatformGuestSessionAtSummaryTransformer.select(),
    },
  );
  // Get total count
  const total = await MyGlobal.prisma.reddit_platform_guest_sessions.count({
    where: whereInput,
  });
  // Transform records and build response
  const paginationPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: paginationPages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditPlatformGuestSessionAtSummaryTransformer.transform,
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
// import { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
// import { IPageIRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformGuestSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformGuestGuestSessions(props: {
//   guest: GuestPayload;
//   body: IRedditPlatformGuestSession.IRequest;
// }): Promise<IPageIRedditPlatformGuestSession.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_guest_sessions.findMany({
//     ...RedditPlatformGuestSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformGuestSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------