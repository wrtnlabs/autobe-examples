import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneGuestSession";
import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCloneGuestSessionAtSummaryTransformer } from "../transformers/RedditCloneGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneGuestGuestSessions(props: {
  guest: GuestPayload;
  body: IRedditCloneGuestSession.IRequest;
}): Promise<IPageIRedditCloneGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.redditCloneGuestId && {
      reddit_clone_guest_id: props.body.redditCloneGuestId,
    }),
    ...(props.body.ip && {
      ip: { contains: props.body.ip },
    }),
    ...(props.body.href && {
      href: { contains: props.body.href },
    }),
    ...(props.body.isActive === true && {
      expired_at: { gt: new Date() },
    }),
    ...(props.body.isActive === false && {
      expired_at: { lte: new Date() },
    }),
    ...(props.body.createdAtFrom && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
    ...(props.body.expiredAtFrom && {
      expired_at: { gte: new Date(props.body.expiredAtFrom) },
    }),
    ...(props.body.expiredAtTo && {
      expired_at: { lte: new Date(props.body.expiredAtTo) },
    }),
  } satisfies Prisma.reddit_clone_guest_sessionsWhereInput;
  const orderByInput = (
    props.body.sort === "expired_at"
      ? { expired_at: props.body.order ?? "desc" }
      : { created_at: props.body.order ?? "desc" }
  ) satisfies Prisma.reddit_clone_guest_sessionsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.reddit_clone_guest_sessions.findMany({
    ...RedditCloneGuestSessionAtSummaryTransformer.select(),
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
  });
  const total = await MyGlobal.prisma.reddit_clone_guest_sessions.count({
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
      RedditCloneGuestSessionAtSummaryTransformer.transform,
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
// import { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
// import { IPageIRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneGuestSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneGuestGuestSessions(props: {
//   guest: GuestPayload;
//   body: IRedditCloneGuestSession.IRequest;
// }): Promise<IPageIRedditCloneGuestSession.ISummary> {
//   const records = await MyGlobal.prisma.reddit_clone_guest_sessions.findMany({
//     ...RedditCloneGuestSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCloneGuestSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------