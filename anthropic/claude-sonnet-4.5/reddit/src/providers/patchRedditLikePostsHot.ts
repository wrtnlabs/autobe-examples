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

export async function patchRedditLikePostsHot(props: {
  body: IRedditLikePost.IHotRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 25;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = toISOStringSafe(sevenDaysAgo);

  const posts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: {
      deleted_at: null,
      created_at: {
        gte: sevenDaysAgoISO,
      },
      ...(body.community_id !== undefined &&
        body.community_id !== null && {
          reddit_like_community_id: body.community_id,
        }),
      community: {
        deleted_at: null,
        is_archived: false,
        privacy_type: "public",
      },
    },
    include: {
      mv_reddit_like_post_metrics: true,
    },
  });

  const nowTime = new Date().getTime();

  const postsWithHotScore = posts.map((post) => {
    const createdAtTime = new Date(post.created_at).getTime();
    const hoursAge = (nowTime - createdAtTime) / (1000 * 60 * 60);

    const voteScore = post.mv_reddit_like_post_metrics?.vote_score ?? 0;
    const hotScore = voteScore / Math.pow(hoursAge + 2, 1.5);

    return {
      id: post.id,
      type: post.type,
      title: post.title,
      created_at: toISOStringSafe(post.created_at),
      hotScore,
    };
  });

  postsWithHotScore.sort((a, b) => b.hotScore - a.hotScore);

  const total = postsWithHotScore.length;
  const skip = (page - 1) * limit;
  const paginatedPosts = postsWithHotScore.slice(skip, skip + limit);

  const results = paginatedPosts.map((post) => ({
    id: post.id,
    type: post.type,
    title: post.title,
    created_at: post.created_at,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results,
  };
}
