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

// ----------------------------------------------------------------
// UTILITY — epoch-ms to ISO string
// ----------------------------------------------------------------
function epochMsToIso(epochMs: number): string {
  return new Date(epochMs).toISOString();
}
function computeTimeframeIso(timeframe: string): string {
  const nowMs: number = Date.now();
  switch (timeframe) {
    case "hour":
      return epochMsToIso(nowMs - 60 * 60 * 1000);
    case "today":
      return epochMsToIso(nowMs - (nowMs % 86400000));
    case "week":
      return epochMsToIso(nowMs - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return epochMsToIso(nowMs - 30 * 24 * 60 * 60 * 1000);
    case "year":
      return epochMsToIso(nowMs - 365 * 24 * 60 * 60 * 1000);
    default:
      return epochMsToIso(0);
  }
}
// ----------------------------------------------------------------
// PUBLIC ENTRY POINT
// ----------------------------------------------------------------
export async function patchCommunityPlatformPostsFeedsPopular(props: {
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const body: ICommunityPlatformPost.IRequest = props.body;
  const sort: string = body.sort ?? "hot";
  const limit: number =
    body.limit !== undefined ? Math.min(body.limit, 50) : 20;
  const page: number = body.page ?? 1;
  const cursor: string | undefined = body.cursor;
  // --- Build WHERE clause ---
  const where: Prisma.community_platform_postsWhereInput = {
    deleted_at: null,
  };
  if (body.communityId !== undefined) {
    where.community = {
      id: body.communityId,
      deleted_at: null,
    };
  }
  if (body.search !== undefined && body.search.trim().length > 0) {
    where.title = {
      contains: body.search.trim(),
      mode: "insensitive",
    };
  }
  if (body.authorId !== undefined) {
    where.member_id = body.authorId;
  }
  if (
    sort === "top" &&
    body.timeframe !== undefined &&
    body.timeframe !== "all"
  ) {
    where.created_at = {
      gte: computeTimeframeIso(body.timeframe),
    };
  }
  // --- Total count ---
  const total: number = await MyGlobal.prisma.community_platform_posts.count({
    where,
  });
  // --- Dispatch by sort mode ---
  if (sort === "new") {
    return handleNewSort(where, limit, page, cursor, total);
  }
  if (sort === "top") {
    return handleTopSort(where, limit, page, cursor, total);
  }
  if (sort === "hot") {
    return handleHotSort(where, limit, page, cursor, total);
  }
  return handleControversialSort(where, limit, page, cursor, total);
}
// ----------------------------------------------------------------
// NEW SORT (created_at DESC) — native Prisma ordering
// ----------------------------------------------------------------
async function handleNewSort(
  where: Prisma.community_platform_postsWhereInput,
  limit: number,
  page: number,
  cursor: string | undefined,
  total: number,
): Promise<IPageICommunityPlatformPost.ISummary> {
  const orderBy: Prisma.community_platform_postsOrderByWithRelationInput = {
    created_at: "desc",
  };
  let records: CommunityPlatformPostAtSummaryTransformer.Payload[];
  let currentPage: number = page;
  if (cursor !== undefined) {
    // Cursor encodes: { created_at: "<ISO string>" }
    let cursorCreatedAt: string;
    try {
      const decoded: Record<string, unknown> = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf-8"),
      );
      if (typeof decoded.created_at !== "string") {
        throw new Error("Invalid cursor");
      }
      cursorCreatedAt = decoded.created_at;
    } catch {
      throw new HttpException("Invalid cursor format", 400);
    }
    records = await MyGlobal.prisma.community_platform_posts.findMany({
      where: {
        ...where,
        created_at: { lt: cursorCreatedAt },
      },
      orderBy,
      take: limit + 1,
      ...CommunityPlatformPostAtSummaryTransformer.select(),
    });
    currentPage = 1;
  } else {
    const skip: number = (page - 1) * limit;
    records = await MyGlobal.prisma.community_platform_posts.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...CommunityPlatformPostAtSummaryTransformer.select(),
    });
  }
  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      CommunityPlatformPostAtSummaryTransformer.transform,
    ),
  };
}
// ----------------------------------------------------------------
// TOP SORT (vote_score DESC, created_at DESC) — native Prisma ordering
// ----------------------------------------------------------------
async function handleTopSort(
  where: Prisma.community_platform_postsWhereInput,
  limit: number,
  page: number,
  cursor: string | undefined,
  total: number,
): Promise<IPageICommunityPlatformPost.ISummary> {
  const orderBy: Prisma.community_platform_postsOrderByWithRelationInput = {
    vote_score: "desc",
  };
  let records: CommunityPlatformPostAtSummaryTransformer.Payload[];
  let currentPage: number = page;
  if (cursor !== undefined) {
    // Cursor encodes: { vote_score: number, created_at: "<ISO string>" }
    let cursorVoteScore: number;
    let cursorCreatedAt: string;
    try {
      const decoded: Record<string, unknown> = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf-8"),
      );
      if (
        typeof decoded.vote_score !== "number" ||
        typeof decoded.created_at !== "string"
      ) {
        throw new Error("Invalid cursor");
      }
      cursorVoteScore = decoded.vote_score;
      cursorCreatedAt = decoded.created_at;
    } catch {
      throw new HttpException("Invalid cursor format", 400);
    }
    records = await MyGlobal.prisma.community_platform_posts.findMany({
      where: {
        ...where,
        OR: [
          { vote_score: { lt: cursorVoteScore } },
          {
            vote_score: cursorVoteScore,
            created_at: { lt: cursorCreatedAt },
          },
        ],
      },
      orderBy: [{ vote_score: "desc" }, { created_at: "desc" }],
      take: limit + 1,
      ...CommunityPlatformPostAtSummaryTransformer.select(),
    });
    currentPage = 1;
  } else {
    const skip: number = (page - 1) * limit;
    records = await MyGlobal.prisma.community_platform_posts.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...CommunityPlatformPostAtSummaryTransformer.select(),
    });
  }
  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      CommunityPlatformPostAtSummaryTransformer.transform,
    ),
  };
}
// ----------------------------------------------------------------
// HOT SORT — in-memory Reddit-style algorithm
// ----------------------------------------------------------------
interface HotScoredPost {
  post: CommunityPlatformPostAtSummaryTransformer.Payload;
  hotScore: number;
}
async function handleHotSort(
  where: Prisma.community_platform_postsWhereInput,
  limit: number,
  page: number,
  cursor: string | undefined,
  total: number,
): Promise<IPageICommunityPlatformPost.ISummary> {
  const allPosts: CommunityPlatformPostAtSummaryTransformer.Payload[] =
    await MyGlobal.prisma.community_platform_posts.findMany({
      where,
      ...CommunityPlatformPostAtSummaryTransformer.select(),
    });
  const nowMs: number = Date.now();
  const scored: HotScoredPost[] = allPosts.map(
    (
      post: CommunityPlatformPostAtSummaryTransformer.Payload,
    ): HotScoredPost => {
      const createdAtMs: number = post.created_at.getTime();
      const hoursElapsed: number = (nowMs - createdAtMs) / 3600000;
      return {
        post,
        hotScore: post.vote_score / Math.pow(hoursElapsed + 2, 1.5),
      };
    },
  );
  scored.sort((a: HotScoredPost, b: HotScoredPost): number => {
    const diff: number = b.hotScore - a.hotScore;
    if (diff !== 0) return diff;
    return b.post.created_at.getTime() - a.post.created_at.getTime();
  });
  const { paged, currentPage } = slicePaginate(scored, page, cursor, limit);
  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      paged.map(
        (
          item: HotScoredPost,
        ): CommunityPlatformPostAtSummaryTransformer.Payload => item.post,
      ),
      CommunityPlatformPostAtSummaryTransformer.transform,
    ),
  };
}
// ----------------------------------------------------------------
// CONTROVERSIAL SORT — in-memory with vote_summaries
// ----------------------------------------------------------------
interface ControversialScoredPost {
  post: CommunityPlatformPostAtSummaryTransformer.Payload;
  controversyScore: number;
}
async function handleControversialSort(
  where: Prisma.community_platform_postsWhereInput,
  limit: number,
  page: number,
  cursor: string | undefined,
  total: number,
): Promise<IPageICommunityPlatformPost.ISummary> {
  const allPosts: CommunityPlatformPostAtSummaryTransformer.Payload[] =
    await MyGlobal.prisma.community_platform_posts.findMany({
      where,
      ...CommunityPlatformPostAtSummaryTransformer.select(),
    });
  let scored: ControversialScoredPost[];
  if (allPosts.length > 0) {
    const postIds: string[] = allPosts.map(
      (p: CommunityPlatformPostAtSummaryTransformer.Payload): string => p.id,
    );
    const summaries =
      await MyGlobal.prisma.community_platform_vote_summaries.findMany({
        where: {
          target_type: "post",
          target_id: { in: postIds },
        },
      });
    const summaryByTargetId: Map<string, (typeof summaries)[0]> = new Map(
      summaries.map(
        (s: (typeof summaries)[0]): [string, (typeof summaries)[0]] => [
          s.target_id,
          s,
        ],
      ),
    );
    scored = allPosts.map(
      (
        post: CommunityPlatformPostAtSummaryTransformer.Payload,
      ): ControversialScoredPost => {
        const summary: (typeof summaries)[0] | undefined =
          summaryByTargetId.get(post.id);
        const totalVotes: number =
          summary !== undefined
            ? summary.upvote_count + summary.downvote_count
            : 0;
        return {
          post,
          controversyScore:
            totalVotes > 0 ? Math.abs(post.vote_score) / totalVotes : 0,
        };
      },
    );
  } else {
    scored = [];
  }
  scored.sort(
    (a: ControversialScoredPost, b: ControversialScoredPost): number => {
      const diff: number = a.controversyScore - b.controversyScore;
      if (diff !== 0) return diff;
      return b.post.created_at.getTime() - a.post.created_at.getTime();
    },
  );
  const { paged, currentPage } = slicePaginate(scored, page, cursor, limit);
  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      paged.map(
        (
          item: ControversialScoredPost,
        ): CommunityPlatformPostAtSummaryTransformer.Payload => item.post,
      ),
      CommunityPlatformPostAtSummaryTransformer.transform,
    ),
  };
}
// ----------------------------------------------------------------
// PAGINATION HELPER — slice-based for in-memory sorted lists
// ----------------------------------------------------------------
interface SlicePaginateResult<T> {
  paged: T[];
  currentPage: number;
}
function slicePaginate<T>(
  items: T[],
  page: number,
  cursor: string | undefined,
  limit: number,
): SlicePaginateResult<T> {
  if (cursor !== undefined) {
    // Opaque cursor for in-memory lists: { index: number }
    let cursorIndex: number;
    try {
      const decoded: Record<string, unknown> = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf-8"),
      );
      if (typeof decoded.index !== "number") {
        throw new Error("Invalid cursor");
      }
      cursorIndex = decoded.index;
    } catch {
      throw new HttpException("Invalid cursor format", 400);
    }
    if (cursorIndex < 0 || cursorIndex >= items.length) {
      return { paged: [], currentPage: 1 };
    }
    return {
      paged: items.slice(cursorIndex + 1, cursorIndex + 1 + limit),
      currentPage: 1,
    };
  }
  const skip: number = (page - 1) * limit;
  return {
    paged: items.slice(skip, skip + limit),
    currentPage: page,
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
// export async function patchCommunityPlatformPostsFeedsPopular(props: {
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