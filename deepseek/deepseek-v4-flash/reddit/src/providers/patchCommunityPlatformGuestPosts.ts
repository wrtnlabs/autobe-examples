import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuestPosts(props: {
  guest: GuestPayload;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // Guest cannot access the home feed — requires member authentication
  if (props.body.feed === "home") {
    throw new HttpException("Unauthorized", 401);
  }
  // Validate community exists and is active when communityId filter is provided
  if (props.body.communityId) {
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: props.body.communityId,
        deleted_at: null,
      },
    });
  }
  // Pagination parameters
  const limit = Math.min(props.body.limit ?? 20, 50);
  const page = props.body.page ?? 1;
  const sort = props.body.sort ?? "hot";
  // Build WHERE clause
  const where: Prisma.community_platform_postsWhereInput = {
    deleted_at: null,
  };
  if (props.body.communityId) {
    where.community_id = props.body.communityId;
  }
  if (props.body.authorId) {
    where.member_id = props.body.authorId;
  }
  if (props.body.search) {
    where.title = { contains: props.body.search, mode: "insensitive" };
  }
  // Timeframe filter for top sort
  if (
    sort === "top" &&
    props.body.timeframe &&
    props.body.timeframe !== "all"
  ) {
    const now = Date.now();
    const cutoffMs: Record<string, number> = {
      hour: now - 3600000,
      today: (() => {
        const d = new Date(now);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      })(),
      week: now - 604800000,
      month: now - 2592000000,
      year: now - 31536000000,
    };
    const cutoff = cutoffMs[props.body.timeframe];
    if (cutoff !== undefined) {
      where.created_at = { gte: new Date(cutoff) };
    }
  }
  // Total matching records (for pagination metadata)
  const total = await MyGlobal.prisma.community_platform_posts.count({ where });
  // Skip for pagination
  const skip = (page - 1) * limit;
  const take = limit;
  // For computed sorts (hot, controversial), fetch full result set and sort in application code
  if (sort === "hot" || sort === "controversial") {
    const rawPosts = await MyGlobal.prisma.community_platform_posts.findMany({
      where,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformPostAtSummaryTransformer.select(),
    });
    if (sort === "hot") {
      rawPosts.sort((a, b) => {
        const now = Date.now();
        const hoursA = (now - a.created_at.getTime()) / 3600000;
        const hoursB = (now - b.created_at.getTime()) / 3600000;
        const scoreA = a.vote_score / Math.pow(hoursA + 2, 1.5);
        const scoreB = b.vote_score / Math.pow(hoursB + 2, 1.5);
        return scoreB - scoreA;
      });
    } else {
      rawPosts.sort((a, b) => {
        const conA = (a.comment_count + 1) / (Math.abs(a.vote_score) + 1);
        const conB = (b.comment_count + 1) / (Math.abs(b.vote_score) + 1);
        return conB - conA;
      });
    }
    const paged = rawPosts.slice(skip, skip + limit);
    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        paged,
        CommunityPlatformPostAtSummaryTransformer.transform,
      ),
    } satisfies IPageICommunityPlatformPost.ISummary;
  }
  // For Prisma-native sorts (new, top), use database ordering directly
  const orderBy: Prisma.community_platform_postsOrderByWithRelationInput[] =
    sort === "new"
      ? [{ created_at: "desc" }]
      : [{ vote_score: "desc" }, { created_at: "desc" }];
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where,
    skip,
    take,
    orderBy,
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      posts,
      CommunityPlatformPostAtSummaryTransformer.transform,
    ),
  } satisfies IPageICommunityPlatformPost.ISummary;
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
// import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
// import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformGuestPosts(props: {
//   guest: GuestPayload;
//   body: ICommunityPlatformPost.IRequest;
// }): Promise<IPageICommunityPlatformPost.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_posts.findMany({
//     ...CommunityPlatformPostAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformPostAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------