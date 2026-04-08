import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberFeedsHome(props: {
  member: MemberPayload;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  const timePeriod = props.body.timePeriod;
  const postTypeFilter = props.body.postType;
  const voteScoreMin = props.body.voteScoreMin;
  const voteScoreMax = props.body.voteScoreMax;
  const dateFrom = props.body.dateFrom;
  const dateTo = props.body.dateTo;
  const communityIdFilter = props.body.communityId;
  const authorIdFilter = props.body.authorId;
  const activeSubscriptions =
    await MyGlobal.prisma.reddit_community_subscriptions.findMany({
      where: {
        reddit_community_member_id: props.member.id,
        status: "active",
        deleted_at: null,
      },
      select: { reddit_community_communities_id: true },
    });
  const activeCommunityIds = activeSubscriptions.map(
    (s) => s.reddit_community_communities_id,
  );
  const bannedCommunities =
    await MyGlobal.prisma.reddit_community_ban_records.findMany({
      where: {
        user_id: props.member.id,
        unban_at: null,
        deleted_at: null,
      },
      select: { community_id: true },
    });
  const bannedCommunityIds = new Set(
    bannedCommunities.map((b) => b.community_id),
  );
  const filteredCommunityIds = activeCommunityIds.filter(
    (id) => !bannedCommunityIds.has(id),
  );
  if (filteredCommunityIds.length === 0) {
    return {
      pagination: {
        current: 1,
        limit: 100,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  const whereBase: Prisma.reddit_community_postsWhereInput = {
    reddit_community_community_id: {
      in: filteredCommunityIds,
    },
    deleted_at: null,
  };
  const whereConditions: Array<Prisma.reddit_community_postsWhereInput> = [];
  if (postTypeFilter !== undefined) {
    whereConditions.push({ post_type: postTypeFilter });
  }
  if (voteScoreMin !== undefined || voteScoreMax !== undefined) {
    const scoreFilter: Prisma.IntFilter = {};
    if (voteScoreMin !== undefined) {
      scoreFilter.gte = voteScoreMin;
    }
    if (voteScoreMax !== undefined) {
      scoreFilter.lte = voteScoreMax;
    }
    whereConditions.push({ vote_score: scoreFilter });
  }
  if (dateFrom !== undefined || dateTo !== undefined) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (dateFrom !== undefined) {
      dateFilter.gte = new Date(dateFrom);
    }
    if (dateTo !== undefined) {
      dateFilter.lte = new Date(dateTo);
    }
    whereConditions.push({ created_at: dateFilter });
  }
  if (communityIdFilter !== undefined) {
    whereConditions.push({ reddit_community_community_id: communityIdFilter });
  }
  if (authorIdFilter !== undefined) {
    whereConditions.push({ reddit_community_member_id: authorIdFilter });
  }
  if (whereConditions.length > 0) {
    (whereBase as Prisma.reddit_community_postsWhereInput).AND =
      whereConditions;
  }
  let orderBy:
    | Prisma.reddit_community_postsOrderByWithRelationInput
    | undefined;
  switch (sort) {
    case "new":
      orderBy = { created_at: "desc" };
      break;
    case "top": {
      let timeFilter: Prisma.DateTimeFilter | undefined;
      if (timePeriod === "today") {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        timeFilter = { gte: oneDayAgo };
      } else if (timePeriod === "this_week") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        timeFilter = { gte: sevenDaysAgo };
      } else if (timePeriod === "this_month") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        timeFilter = { gte: thirtyDaysAgo };
      } else if (timePeriod === "this_year") {
        const threeSixFiveDaysAgo = new Date();
        threeSixFiveDaysAgo.setDate(threeSixFiveDaysAgo.getDate() - 365);
        timeFilter = { gte: threeSixFiveDaysAgo };
      }
      if (timeFilter !== undefined) {
        const topWhere: Prisma.reddit_community_postsWhereInput = {
          ...whereBase,
          created_at: timeFilter,
        };
        const records = await MyGlobal.prisma.reddit_community_posts.findMany({
          where: topWhere,
          ...RedditCommunityPostAtSummaryTransformer.select(),
          skip,
          take: limit,
          orderBy: { vote_score: "desc" },
        });
        const total = await MyGlobal.prisma.reddit_community_posts.count({
          where: topWhere,
        });
        return {
          pagination: {
            current: page,
            limit,
            records: total,
            pages: Math.ceil(total / limit),
          } satisfies IPage.IPagination,
          data: await ArrayUtil.asyncMap(
            records,
            RedditCommunityPostAtSummaryTransformer.transform,
          ),
        };
      }
      orderBy = { vote_score: "desc" };
      break;
    }
    case "controversial":
      orderBy = { vote_score: "asc" };
      break;
    case "hot":
    default:
      orderBy = { created_at: "desc" };
      break;
  }
  const records = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereBase,
    ...RedditCommunityPostAtSummaryTransformer.select(),
    skip,
    take: limit,
    orderBy: orderBy,
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereBase,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunityPostAtSummaryTransformer.transform,
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
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityMemberFeedsHome(props: {
//   member: MemberPayload;
//   body: IRedditCommunityPost.IRequest;
// }): Promise<IPageIRedditCommunityPost.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_posts.findMany({
//     ...RedditCommunityPostAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityPostAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------