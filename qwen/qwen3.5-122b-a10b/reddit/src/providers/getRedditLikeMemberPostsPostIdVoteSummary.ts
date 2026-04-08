import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberPostsPostIdVoteSummary(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePost.IVoteSummary> {
  // Verify post exists and is not soft-deleted
  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId, deleted_at: null },
  });
  // Aggregate votes by type
  const votes = await MyGlobal.prisma.reddit_like_votes.groupBy({
    by: ["vote_type"],
    where: {
      reddit_like_post_id: props.postId,
      deleted_at: null,
    },
    _count: { vote_type: true },
  });
  // Calculate counts from aggregated results
  let upvote_count = 0;
  let downvote_count = 0;
  for (const vote of votes) {
    if (vote.vote_type === "upvote") {
      upvote_count = vote._count.vote_type;
    } else if (vote.vote_type === "downvote") {
      downvote_count = vote._count.vote_type;
    }
  }
  return {
    id: props.postId,
    vote_score: upvote_count - downvote_count,
    upvote_count,
    downvote_count,
  };
}
