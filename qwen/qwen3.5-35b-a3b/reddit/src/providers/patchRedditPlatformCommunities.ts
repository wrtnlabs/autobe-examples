import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformCommunities(props: {
  body: IRedditPlatformCommunity.IRequest;
}): Promise<IPageIRedditPlatformCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.page_size ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause for filtering
  const where: Prisma.reddit_platform_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.name_search
      ? { name: { contains: props.body.name_search } }
      : {}),
  };
  // Build ORDER BY clause
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderBy: Prisma.reddit_platform_communitiesOrderByWithRelationInput[] =
    sortBy === "subscriber_count"
      ? [
          {
            communityMemberships: {
              _count: sortOrder as "asc" | "desc",
            },
          },
        ]
      : sortBy === "name"
        ? [{ name: sortOrder as "asc" | "desc" }]
        : [{ created_at: sortOrder as "asc" | "desc" }];
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_platform_communities.count({
    where,
  });
  // Get paginated results
  const records = await MyGlobal.prisma.reddit_platform_communities.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...RedditPlatformCommunityAtSummaryTransformer.select(),
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    records,
    RedditPlatformCommunityAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditPlatformCommunity.ISummary;
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
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// import { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformCommunities(props: {
//   body: IRedditPlatformCommunity.IRequest;
// }): Promise<IPageIRedditPlatformCommunity.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_communities.findMany({
//     ...RedditPlatformCommunityAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformCommunityAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------