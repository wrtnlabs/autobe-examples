import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function patchRedditLikeUsersUserIdPosts(props: {
  userId: string & tags.Format<"uuid">;
  body: IRedditLikeUser.IPostsRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const { userId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const sortBy = body.sort_by ?? "new";

  const skip = (page - 1) * limit;

  const whereCondition = {
    reddit_like_member_id: userId,
    deleted_at: null,
  };

  const needsMetrics = sortBy === "top" || sortBy === "controversial";

  if (needsMetrics) {
    const [allPosts, totalRecords] = await Promise.all([
      MyGlobal.prisma.reddit_like_posts.findMany({
        where: whereCondition,
        select: {
          id: true,
          type: true,
          title: true,
          created_at: true,
          mv_reddit_like_post_metrics: {
            select: {
              vote_score: true,
              upvote_count: true,
              downvote_count: true,
            },
          },
        },
      }),
      MyGlobal.prisma.reddit_like_posts.count({
        where: whereCondition,
      }),
    ]);

    let sortedPosts = [...allPosts];

    if (sortBy === "top") {
      sortedPosts.sort((a, b) => {
        const aScore = a.mv_reddit_like_post_metrics?.vote_score ?? 0;
        const bScore = b.mv_reddit_like_post_metrics?.vote_score ?? 0;
        return bScore - aScore;
      });
    } else if (sortBy === "controversial") {
      sortedPosts.sort((a, b) => {
        const aMetrics = a.mv_reddit_like_post_metrics;
        const bMetrics = b.mv_reddit_like_post_metrics;

        const aUp = aMetrics?.upvote_count ?? 0;
        const aDown = aMetrics?.downvote_count ?? 0;
        const bUp = bMetrics?.upvote_count ?? 0;
        const bDown = bMetrics?.downvote_count ?? 0;

        const aControversy = Math.min(aUp, aDown);
        const bControversy = Math.min(bUp, bDown);

        return bControversy - aControversy;
      });
    }

    const paginatedPosts = sortedPosts.slice(skip, skip + limit);

    const postSummaries: IRedditLikePost.ISummary[] = paginatedPosts.map(
      (post) => ({
        id: post.id as string & tags.Format<"uuid">,
        type: post.type,
        title: post.title,
        created_at: toISOStringSafe(post.created_at),
      }),
    );

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: totalRecords,
        pages: totalPages,
      },
      data: postSummaries,
    };
  }

  const [posts, totalRecords] = await Promise.all([
    MyGlobal.prisma.reddit_like_posts.findMany({
      where: whereCondition,
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
      where: whereCondition,
    }),
  ]);

  const postSummaries: IRedditLikePost.ISummary[] = posts.map((post) => ({
    id: post.id as string & tags.Format<"uuid">,
    type: post.type,
    title: post.title,
    created_at: toISOStringSafe(post.created_at),
  }));

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalRecords,
      pages: totalPages,
    },
    data: postSummaries,
  };
}
