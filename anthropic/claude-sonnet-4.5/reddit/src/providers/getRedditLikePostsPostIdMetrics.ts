import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePostMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostMetrics";

export async function getRedditLikePostsPostIdMetrics(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePostMetrics> {
  const { postId } = props;

  const metrics =
    await MyGlobal.prisma.mv_reddit_like_post_metrics.findUniqueOrThrow({
      where: {
        reddit_like_post_id: postId,
      },
    });

  return {
    id: metrics.id,
    reddit_like_post_id: metrics.reddit_like_post_id,
    vote_score: metrics.vote_score,
    comment_count: metrics.comment_count,
    upvote_count: metrics.upvote_count,
    downvote_count: metrics.downvote_count,
    last_calculated_at: toISOStringSafe(metrics.last_calculated_at),
  };
}
