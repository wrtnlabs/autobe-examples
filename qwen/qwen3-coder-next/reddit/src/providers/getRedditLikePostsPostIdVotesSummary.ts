import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVoteSummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikePostsPostIdVotesSummary(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePostVoteSummary> {
  // First verify the post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, deleted_at: true },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Count upvotes and downvotes separately
  const upvoteCount = await MyGlobal.prisma.reddit_like_post_votes.count({
    where: { post_id: props.postId, value: 1 },
  });
  const downvoteCount = await MyGlobal.prisma.reddit_like_post_votes.count({
    where: { post_id: props.postId, value: -1 },
  });
  // Get vote score from the sums table
  const voteSum =
    await MyGlobal.prisma.reddit_like_post_votes_sums.findUniqueOrThrow({
      where: { reddit_like_post_id: props.postId },
      select: { vote_score: true },
    });
  return {
    vote_score: voteSum.vote_score,
    upvote_count: upvoteCount,
    downvote_count: downvoteCount,
  };
}
