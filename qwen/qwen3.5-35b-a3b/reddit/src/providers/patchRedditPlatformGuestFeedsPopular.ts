import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPopularFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPopularFeedRequest";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformGuestFeedsPopular(props: {
  guest: GuestPayload;
  body: IRedditPlatformPopularFeedRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = (props.body.page ?? 1) satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const limit = Math.min(props.body.limit ?? 20, 100) satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const skip = (page - 1) * limit;
  const sort = (props.body.sort ?? "hot") satisfies
    | "hot"
    | "new"
    | "top"
    | "controversial";
  const search = props.body.search;
  // Search filter: only search by title (textContent structure unknown)
  const searchFilter: Prisma.reddit_platform_postsWhereInput =
    search && search.trim().length > 0
      ? {
          title: { contains: search.trim(), mode: "insensitive" },
        }
      : {};
  // Time range filter for 'top' sort
  const topTimeRange = (props.body.topTimeRange ?? "all") satisfies
    | "today"
    | "week"
    | "month"
    | "year"
    | "all";
  const hoursMap = {
    today: 24,
    week: 7 * 24,
    month: 30 * 24,
    year: 365 * 24,
    all: null,
  } as const;
  const topTimeFilter: Prisma.reddit_platform_postsWhereInput =
    sort === "top" && topTimeRange !== "all"
      ? {
          created_at: {
            gte: new Date(
              Date.now() - hoursMap[topTimeRange]! * 60 * 60 * 1000,
            ),
          },
        }
      : {};
  const combinedFilter = {
    ...searchFilter,
    ...topTimeFilter,
    deleted_at: null,
  } satisfies Prisma.reddit_platform_postsWhereInput;
  // Sorting logic
  const orderBy: Prisma.reddit_platform_postsOrderByWithRelationInput[] =
    sort === "new"
      ? [{ created_at: "desc" }]
      : sort === "controversial"
        ? [
            // Controversial: posts with high engagement but polarized opinions
            // Order by upvotes ASC (fewest upvotes), then created_at DESC
            { upvotes_count: "asc", created_at: "desc" },
          ]
        : [
            // Hot: hybrid of recency and engagement
            // Order by upvotes desc, then created_at desc
            { upvotes_count: "desc", created_at: "desc" },
          ];
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_posts.findMany({
      where: combinedFilter,
      orderBy,
      skip,
      take: limit,
      ...RedditPlatformPostAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_posts.count({
      where: combinedFilter,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditPlatformPostAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformPost.ISummary;
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
// import { IRedditPlatformPopularFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPopularFeedRequest";
// import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformGuestFeedsPopular(props: {
//   guest: GuestPayload;
//   body: IRedditPlatformPopularFeedRequest;
// }): Promise<IPageIRedditPlatformPost.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_posts.findMany({
//     ...RedditPlatformPostAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformPostAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------