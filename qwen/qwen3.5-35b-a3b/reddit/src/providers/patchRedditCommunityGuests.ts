import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityGuestAtSummaryTransformer } from "../transformers/RedditCommunityGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityGuests(props: {
  body: IRedditCommunityGuest.IRequest;
}): Promise<IPageIRedditCommunityGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const whereInput: Prisma.reddit_community_guestsWhereInput = {
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email, mode: "insensitive" as const },
    }),
    ...(props.body.device_id !== undefined && {
      device_id: props.body.device_id,
    }),
    ...(props.body.device_fingerprint !== undefined && {
      device_fingerprint: {
        contains: props.body.device_fingerprint,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.created_at_min !== undefined && {
      created_at: { gte: new Date(props.body.created_at_min) },
    }),
    ...(props.body.created_at_max !== undefined && {
      created_at: { lte: new Date(props.body.created_at_max) },
    }),
    ...(props.body.deleted_at !== undefined && {
      deleted_at: props.body.deleted_at ? { not: null } : null,
    }),
  } satisfies Prisma.reddit_community_guestsWhereInput;
  const orderByInput = {
    [sortField]: sortOrder === "asc" ? "asc" : "desc",
  } satisfies Prisma.reddit_community_guestsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.reddit_community_guests.findMany({
    ...RedditCommunityGuestAtSummaryTransformer.select(),
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
  });
  const total = await MyGlobal.prisma.reddit_community_guests.count({
    where: whereInput,
  });
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunityGuestAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityGuest.ISummary;
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
// import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
// import { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityGuests(props: {
//   body: IRedditCommunityGuest.IRequest;
// }): Promise<IPageIRedditCommunityGuest.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_guests.findMany({
//     ...RedditCommunityGuestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityGuestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------