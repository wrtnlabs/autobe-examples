import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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

export async function patchRedditPlatformGuestTrendingPosts(props: {
  guest: GuestPayload;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.limit ?? 20;
  const sort: "hot" | "new" | "top" | "controversial" =
    props.body.sort ?? "new";
  const topTimeRange: "today" | "week" | "month" | "year" | "all" | undefined =
    props.body.topTimeRange;
  const offset: number = (page - 1) * limit;
  // Build where clause for soft-deleted filter
  const where: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
  };
  // Apply time range filter for top sorting using Prisma native date filtering
  if (sort === "top" && topTimeRange && topTimeRange !== "all") {
    const timeDiffMs: Record<string, number> = {
      today: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };
    const milliseconds: number = timeDiffMs[topTimeRange] ?? 0;
    if (milliseconds > 0) {
      where.created_at = { gte: new Date(Date.now() - milliseconds) };
    }
  }
  // Build orderBy based on sort parameter
  const orderBy: Prisma.reddit_platform_postsOrderByWithRelationInput[] = [];
  switch (sort) {
    case "hot":
      // Hot: combination of recency and engagement
      orderBy.push({ created_at: "desc" });
      break;
    case "new":
      // New: most recent first
      orderBy.push({ created_at: "desc" });
      break;
    case "top":
      // Top: highest score first
      orderBy.push({ upvotes_count: "desc" });
      break;
    case "controversial":
      // Controversial: most votes but score near zero
      orderBy.push({ upvotes_count: "desc" });
      break;
    default:
      orderBy.push({ created_at: "desc" });
  }
  // Fetch posts
  const records: Array<
    Prisma.reddit_platform_postsGetPayload<
      ReturnType<typeof RedditPlatformPostAtSummaryTransformer.select>
    >
  > = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where,
    orderBy,
    skip: offset,
    take: limit,
    ...RedditPlatformPostAtSummaryTransformer.select(),
  });
  // Fetch total count
  const total: number = await MyGlobal.prisma.reddit_platform_posts.count({
    where,
  });
  // Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditPlatformPostAtSummaryTransformer.transform,
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
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformGuestTrendingPosts(props: {
//   guest: GuestPayload;
//   body: IRedditPlatformPost.IRequest;
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