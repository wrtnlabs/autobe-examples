import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function patchRedditLikeCommunitiesCommunityIdPosts(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunity.IPostSearchRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const { communityId, body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 25);
  const sortBy = body.sort_by ?? "hot";

  const skip = (page - 1) * limit;

  const baseWhere = {
    reddit_like_community_id: communityId,
    deleted_at: null,
  };

  if (sortBy === "new") {
    const [posts, total] = await Promise.all([
      MyGlobal.prisma.reddit_like_posts.findMany({
        where: baseWhere,
        orderBy: { created_at: "desc" },
        skip: skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          created_at: true,
        },
      }),
      MyGlobal.prisma.reddit_like_posts.count({
        where: baseWhere,
      }),
    ]);

    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: posts.map((post) => ({
        id: post.id,
        type: post.type,
        title: post.title,
        created_at: toISOStringSafe(post.created_at),
      })),
    };
  } else if (sortBy === "top") {
    const [allResults, total] = await Promise.all([
      MyGlobal.prisma.reddit_like_posts.findMany({
        where: baseWhere,
        include: {
          mv_reddit_like_post_metrics: {
            select: {
              vote_score: true,
            },
          },
        },
      }),
      MyGlobal.prisma.reddit_like_posts.count({
        where: baseWhere,
      }),
    ]);

    const sortedResults = allResults.sort((a, b) => {
      const scoreA = a.mv_reddit_like_post_metrics?.vote_score ?? 0;
      const scoreB = b.mv_reddit_like_post_metrics?.vote_score ?? 0;
      return scoreB - scoreA;
    });

    const paginatedResults = sortedResults.slice(skip, skip + limit);

    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: paginatedResults.map((post) => ({
        id: post.id,
        type: post.type,
        title: post.title,
        created_at: toISOStringSafe(post.created_at),
      })),
    };
  } else if (sortBy === "controversial") {
    const [allResults, total] = await Promise.all([
      MyGlobal.prisma.reddit_like_posts.findMany({
        where: baseWhere,
        include: {
          mv_reddit_like_post_metrics: {
            select: {
              upvote_count: true,
              downvote_count: true,
            },
          },
        },
      }),
      MyGlobal.prisma.reddit_like_posts.count({
        where: baseWhere,
      }),
    ]);

    const sortedResults = allResults.sort((a, b) => {
      const upvotesA = a.mv_reddit_like_post_metrics?.upvote_count ?? 0;
      const downvotesA = a.mv_reddit_like_post_metrics?.downvote_count ?? 0;
      const upvotesB = b.mv_reddit_like_post_metrics?.upvote_count ?? 0;
      const downvotesB = b.mv_reddit_like_post_metrics?.downvote_count ?? 0;

      const totalA = upvotesA + downvotesA;
      const totalB = upvotesB + downvotesB;

      if (totalA === 0) return 1;
      if (totalB === 0) return -1;

      const ratioA =
        Math.min(upvotesA, downvotesA) / Math.max(upvotesA, downvotesA);
      const ratioB =
        Math.min(upvotesB, downvotesB) / Math.max(upvotesB, downvotesB);

      const controversyA = ratioA * totalA;
      const controversyB = ratioB * totalB;

      return controversyB - controversyA;
    });

    const paginatedResults = sortedResults.slice(skip, skip + limit);

    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: paginatedResults.map((post) => ({
        id: post.id,
        type: post.type,
        title: post.title,
        created_at: toISOStringSafe(post.created_at),
      })),
    };
  } else {
    const [posts, total] = await Promise.all([
      MyGlobal.prisma.reddit_like_posts.findMany({
        where: baseWhere,
        orderBy: { created_at: "desc" },
        skip: skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          created_at: true,
        },
      }),
      MyGlobal.prisma.reddit_like_posts.count({
        where: baseWhere,
      }),
    ]);

    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: posts.map((post) => ({
        id: post.id,
        type: post.type,
        title: post.title,
        created_at: toISOStringSafe(post.created_at),
      })),
    };
  }
}
