import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchRedditLikePosts(props: {
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 25;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null,
    ...(body.community_id !== undefined &&
      body.community_id !== null && {
        reddit_like_community_id: body.community_id,
      }),
    ...(body.type !== undefined &&
      body.type !== null && {
        type: body.type,
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        title: {
          contains: body.search,
        },
      }),
  };

  const sortBy = body.sort_by ?? "hot";

  if (sortBy === "new") {
    const [posts, total] = await Promise.all([
      MyGlobal.prisma.reddit_like_posts.findMany({
        where: whereCondition,
        orderBy: { created_at: "desc" },
        skip: skip,
        take: limit,
      }),
      MyGlobal.prisma.reddit_like_posts.count({
        where: whereCondition,
      }),
    ]);

    const data = posts.map((post) => ({
      id: post.id,
      type: post.type,
      title: post.title,
      created_at: toISOStringSafe(post.created_at),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: totalPages,
      },
      data: data,
    };
  }

  const [postsWithMetrics, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_posts.findMany({
      where: whereCondition,
      include: {
        mv_reddit_like_post_metrics: true,
      },
    }),
    MyGlobal.prisma.reddit_like_posts.count({
      where: whereCondition,
    }),
  ]);

  const now = new Date();
  const nowTime = now.getTime();

  let sortedPosts = postsWithMetrics;

  if (sortBy === "top") {
    sortedPosts = postsWithMetrics.sort((a, b) => {
      const scoreA = a.mv_reddit_like_post_metrics?.vote_score ?? 0;
      const scoreB = b.mv_reddit_like_post_metrics?.vote_score ?? 0;
      return scoreB - scoreA;
    });
  } else if (sortBy === "controversial") {
    sortedPosts = postsWithMetrics.sort((a, b) => {
      const metricsA = a.mv_reddit_like_post_metrics;
      const metricsB = b.mv_reddit_like_post_metrics;

      const upvotesA = metricsA?.upvote_count ?? 0;
      const downvotesA = metricsA?.downvote_count ?? 0;
      const totalA = upvotesA + downvotesA;

      const upvotesB = metricsB?.upvote_count ?? 0;
      const downvotesB = metricsB?.downvote_count ?? 0;
      const totalB = upvotesB + downvotesB;

      if (totalA === 0 && totalB === 0) return 0;
      if (totalA === 0) return 1;
      if (totalB === 0) return -1;

      const balanceA = Math.abs(0.5 - upvotesA / totalA);
      const balanceB = Math.abs(0.5 - upvotesB / totalB);

      const controversyA = (1 - balanceA * 2) * Math.min(upvotesA, downvotesA);
      const controversyB = (1 - balanceB * 2) * Math.min(upvotesB, downvotesB);

      return controversyB - controversyA;
    });
  } else {
    sortedPosts = postsWithMetrics.sort((a, b) => {
      const metricsA = a.mv_reddit_like_post_metrics;
      const metricsB = b.mv_reddit_like_post_metrics;

      const scoreA = metricsA?.vote_score ?? 0;
      const scoreB = metricsB?.vote_score ?? 0;

      const ageHoursA = (nowTime - a.created_at.getTime()) / (1000 * 60 * 60);
      const ageHoursB = (nowTime - b.created_at.getTime()) / (1000 * 60 * 60);

      const hotScoreA = scoreA / Math.pow(ageHoursA + 2, 1.5);
      const hotScoreB = scoreB / Math.pow(ageHoursB + 2, 1.5);

      return hotScoreB - hotScoreA;
    });
  }

  const paginatedPosts = sortedPosts.slice(skip, skip + limit);

  const data = paginatedPosts.map((post) => ({
    id: post.id,
    type: post.type,
    title: post.title,
    created_at: toISOStringSafe(post.created_at),
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: totalPages,
    },
    data: data,
  };
}
