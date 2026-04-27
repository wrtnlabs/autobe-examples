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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberPostsFeedsHome(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const sort = props.body.sort ?? "hot";
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Base WHERE clause: active posts from subscribed communities
  const where: Prisma.community_platform_postsWhereInput = {
    deleted_at: null,
    community: {
      deleted_at: null,
      subscriptionSubscribers: {
        some: {
          member_id: props.member.id,
        },
      },
    },
  };
  // Optional filters: search by title, filter by author
  if (props.body.search) {
    where.title = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.authorId) {
    where.member_id = props.body.authorId;
  }
  let records: CommunityPlatformPostAtSummaryTransformer.Payload[];
  let total: number;
  if (sort === "hot") {
    // Fetch lightweight scoring data, sort in-memory, paginate IDs
    const scoringData = await MyGlobal.prisma.community_platform_posts.findMany(
      {
        where,
        select: {
          id: true,
          vote_score: true,
          created_at: true,
        },
      },
    );
    total = scoringData.length;
    const nowMs = Date.now();
    // Sort by hotness: vote_score / (hours_since_creation + 2)^1.5
    const sortedIds = scoringData
      .map((p) => ({
        id: p.id,
        hotness:
          p.vote_score /
          Math.pow((nowMs - p.created_at.getTime()) / 3600000 + 2, 1.5),
      }))
      .sort((a, b) => {
        const diff = b.hotness - a.hotness;
        if (diff !== 0) return diff;
        return 0;
      })
      .slice(skip, skip + limit)
      .map((entry) => entry.id);
    records = await fetchRecordsByIds(sortedIds);
  } else if (sort === "controversial") {
    // Fetch scoring data + vote summaries, sort by controversy
    const scoringData = await MyGlobal.prisma.community_platform_posts.findMany(
      {
        where,
        select: {
          id: true,
          vote_score: true,
        },
      },
    );
    total = scoringData.length;
    const allIds = scoringData.map((p) => p.id);
    const voteSummaries =
      await MyGlobal.prisma.community_platform_vote_summaries.findMany({
        where: {
          target_type: "post",
          target_id: { in: allIds },
        },
      });
    const summaryMap = new Map(voteSummaries.map((s) => [s.target_id, s]));
    const sortedIds = scoringData
      .map((p) => {
        const summary = summaryMap.get(p.id);
        const upvotes = summary?.upvote_count ?? 0;
        const downvotes = summary?.downvote_count ?? 0;
        return {
          id: p.id,
          totalVotes: upvotes + downvotes,
          absNetScore: Math.abs(summary?.net_score ?? 0),
        };
      })
      .sort((a, b) => {
        const diff = b.totalVotes - a.totalVotes;
        if (diff !== 0) return diff;
        return a.absNetScore - b.absNetScore;
      })
      .slice(skip, skip + limit)
      .map((entry) => entry.id);
    records = await fetchRecordsByIds(sortedIds);
  } else {
    // New or Top sort — use Prisma ORDER BY directly
    if (sort === "top") {
      if (props.body.timeframe && props.body.timeframe !== "all") {
        where.created_at = {
          gte: getTimeframeStart(props.body.timeframe),
        };
      }
    }
    total = await MyGlobal.prisma.community_platform_posts.count({
      where,
    });
    const orderBy: Prisma.community_platform_postsOrderByWithRelationInput[] =
      sort === "new" ? [{ created_at: "desc" }] : [{ vote_score: "desc" }];
    records = await MyGlobal.prisma.community_platform_posts.findMany({
      where,
      ...CommunityPlatformPostAtSummaryTransformer.select(),
      orderBy,
      skip,
      take: limit,
    });
  }
  return {
    data: await ArrayUtil.asyncMap(
      records,
      CommunityPlatformPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
/**
 * Batch-fetch full post records by their IDs and return them in the same order.
 */
async function fetchRecordsByIds(
  ids: string[],
): Promise<CommunityPlatformPostAtSummaryTransformer.Payload[]> {
  if (ids.length === 0) {
    return [];
  }
  const unorderedRecords =
    await MyGlobal.prisma.community_platform_posts.findMany({
      where: { id: { in: ids } },
      ...CommunityPlatformPostAtSummaryTransformer.select(),
    });
  const recordMap = new Map(unorderedRecords.map((r) => [r.id, r]));
  const ordered: CommunityPlatformPostAtSummaryTransformer.Payload[] = [];
  for (const id of ids) {
    const record = recordMap.get(id);
    if (record !== undefined) {
      ordered.push(record);
    }
  }
  return ordered;
}
/**
 * Compute the start Date for a given timeframe string.
 * Uses JavaScript Date internally for Prisma DateTime compatibility.
 */
function getTimeframeStart(
  timeframe: "hour" | "today" | "week" | "month" | "year" | "all",
): Date {
  const now = Date.now();
  switch (timeframe) {
    case "hour":
      return new Date(now - 60 * 60 * 1000);
    case "today": {
      const d = new Date(now);
      return new Date(
        Date.UTC(
          d.getUTCFullYear(),
          d.getUTCMonth(),
          d.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
    }
    case "week":
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case "year":
      return new Date(now - 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(0);
  }
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
// export async function patchCommunityPlatformMemberPostsFeedsHome(props: {
//   member: MemberPayload;
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