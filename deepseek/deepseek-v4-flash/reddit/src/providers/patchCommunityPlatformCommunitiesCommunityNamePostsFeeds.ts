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
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunitiesCommunityNamePostsFeeds(props: {
  communityName: string;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // ----
  // 1. RESOLVE COMMUNITY
  // ----
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // ----
  // 2. BUILD WHERE CLAUSE
  // ----
  const where: Prisma.community_platform_postsWhereInput = {
    community_id: community.id,
    deleted_at: null,
  };
  // Search filter (case-insensitive title substring)
  if (
    typeof props.body.search === "string" &&
    props.body.search.trim().length > 0
  ) {
    where.title = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Author filter
  if (props.body.authorId !== undefined) {
    where.member_id = props.body.authorId;
  }
  // Sort mode
  const sort: NonNullable<ICommunityPlatformPost.IRequest["sort"]> =
    props.body.sort ?? "hot";
  // Timeframe filter (only effective for 'top' sort)
  if (
    sort === "top" &&
    props.body.timeframe !== undefined &&
    props.body.timeframe !== "all"
  ) {
    const nowMillis: number = Date.now();
    let intervalStartMillis: number;
    switch (props.body.timeframe) {
      case "hour":
        intervalStartMillis = nowMillis - 60 * 60 * 1000;
        break;
      case "today": {
        const todayStart: Date = new Date(nowMillis);
        todayStart.setHours(0, 0, 0, 0);
        intervalStartMillis = todayStart.getTime();
        break;
      }
      case "week":
        intervalStartMillis = nowMillis - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        intervalStartMillis = nowMillis - 30 * 24 * 60 * 60 * 1000;
        break;
      case "year":
        intervalStartMillis = nowMillis - 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        intervalStartMillis = 0;
    }
    where.created_at = {
      gte: new Date(intervalStartMillis),
    };
  }
  // ----
  // 3. PAGINATION PARAMETERS
  // ----
  const limit: number = props.body.limit ?? 20;
  const page: number = props.body.page ?? 1;
  const skip: number = (page - 1) * limit;
  // ----
  // 4. IN-MEMORY SORTS (hot, controversial)
  // ----
  if (sort === "hot" || sort === "controversial") {
    const allRecords = await MyGlobal.prisma.community_platform_posts.findMany({
      where,
      ...CommunityPlatformPostAtSummaryTransformer.select(),
      orderBy: {
        created_at: "desc",
      },
    });
    const totalRecords: number = allRecords.length;
    let sorted: typeof allRecords;
    if (sort === "hot") {
      // Reddit hotness: score / (hours_since_creation + 2)^1.5
      const nowMillis: number = Date.now();
      sorted = allRecords.slice().sort((a, b) => {
        const hoursA: number =
          (nowMillis - a.created_at.getTime()) / (60 * 60 * 1000);
        const hoursB: number =
          (nowMillis - b.created_at.getTime()) / (60 * 60 * 1000);
        const hotnessA: number = a.vote_score / Math.pow(hoursA + 2, 1.5);
        const hotnessB: number = b.vote_score / Math.pow(hoursB + 2, 1.5);
        return hotnessB - hotnessA;
      });
    } else {
      // Controversial score: (upvotes + downvotes) / (|net_score| + 1)
      const postIds: string[] = allRecords.map((r) => r.id);
      const summaries =
        await MyGlobal.prisma.community_platform_vote_summaries.findMany({
          where: {
            target_type: "post",
            target_id: {
              in: postIds,
            },
          },
        });
      const summaryMap: Map<string, (typeof summaries)[0]> = new Map(
        summaries.map((s) => [s.target_id, s]),
      );
      sorted = allRecords.slice().sort((a, b) => {
        const sa = summaryMap.get(a.id);
        const sb = summaryMap.get(b.id);
        const ca: number = sa
          ? (sa.upvote_count + sa.downvote_count) / (Math.abs(sa.net_score) + 1)
          : 0;
        const cb: number = sb
          ? (sb.upvote_count + sb.downvote_count) / (Math.abs(sb.net_score) + 1)
          : 0;
        return cb - ca;
      });
    }
    const paged = sorted.slice(skip, skip + limit);
    return {
      pagination: {
        current: page,
        limit,
        records: totalRecords,
        pages: totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0,
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        paged,
        CommunityPlatformPostAtSummaryTransformer.transform,
      ),
    };
  }
  // ----
  // 5. PRISMA-NATIVE SORTS (new → created_at DESC, top → vote_score DESC)
  // ----
  const orderBy:
    | Prisma.community_platform_postsOrderByWithRelationInput
    | Prisma.community_platform_postsOrderByWithRelationInput[] =
    sort === "new" ? { created_at: "desc" } : { vote_score: "desc" };
  const records = await MyGlobal.prisma.community_platform_posts.findMany({
    where,
    ...CommunityPlatformPostAtSummaryTransformer.select(),
    orderBy,
    skip,
    take: limit,
  });
  const totalRecords: number =
    await MyGlobal.prisma.community_platform_posts.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      CommunityPlatformPostAtSummaryTransformer.transform,
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
// import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
// import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformCommunitiesCommunityNamePostsFeeds(props: {
//   communityName: string;
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