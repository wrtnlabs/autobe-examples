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

export async function patchRedditLikeCommunitiesCommunityIdPostsHot(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikePost.IHotRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const { communityId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 25;

  const posts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: {
      reddit_like_community_id: communityId,
      deleted_at: null,
    },
    include: {
      mv_reddit_like_post_metrics: true,
    },
  });

  const now = toISOStringSafe(new Date());
  const nowTime = Date.parse(now);

  const postsWithHotScore = posts.map((post) => {
    const voteScore = post.mv_reddit_like_post_metrics?.vote_score ?? 0;
    const createdAtTime = Date.parse(toISOStringSafe(post.created_at));
    const ageHours = (nowTime - createdAtTime) / (1000 * 60 * 60);

    const hotScore =
      voteScore < 0 ? -1000000 : (voteScore - 1) / Math.pow(ageHours + 2, 1.8);

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

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: paginatedPosts.map((post) => ({
      id: post.id,
      type: post.type,
      title: post.title,
      created_at: post.created_at,
    })),
  };
}
