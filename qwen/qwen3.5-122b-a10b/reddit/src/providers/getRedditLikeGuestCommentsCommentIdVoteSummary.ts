import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeGuestCommentsCommentIdVoteSummary(props: {
  guest: GuestPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeComment.IVoteSummary> {
  // Verify comment exists and is not deleted
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId, deleted_at: null },
    select: { id: true },
  });
  // Aggregate votes using groupBy
  const voteStats = await MyGlobal.prisma.reddit_like_votes.groupBy({
    by: ["vote_type"],
    where: {
      reddit_like_comment_id: props.commentId,
      deleted_at: null,
    },
    _count: { vote_type: true },
  });
  // Calculate upvote and downvote counts
  let upvoteCount = 0;
  let downvoteCount = 0;
  for (const stat of voteStats) {
    if (stat.vote_type === "upvote") {
      upvoteCount = stat._count.vote_type;
    } else if (stat.vote_type === "downvote") {
      downvoteCount = stat._count.vote_type;
    }
  }
  // Calculate vote score
  const voteScore = upvoteCount - downvoteCount;
  // Return vote summary with proper typing via satisfies
  return {
    id: comment.id,
    vote_score: voteScore,
    upvote_count: upvoteCount,
    downvote_count: downvoteCount,
  } satisfies IRedditLikeComment.IVoteSummary;
}
