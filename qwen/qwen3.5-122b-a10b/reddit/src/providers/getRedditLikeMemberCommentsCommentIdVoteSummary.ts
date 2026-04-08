import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
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

export async function getRedditLikeMemberCommentsCommentIdVoteSummary(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeComment.IVoteSummary> {
  // Verify comment exists and is not deleted
  await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Aggregate votes by type
  const voteStats = await MyGlobal.prisma.reddit_like_votes.groupBy({
    by: ["vote_type"],
    where: {
      reddit_like_comment_id: props.commentId,
      deleted_at: null,
    },
    _count: {
      vote_type: true,
    },
  });
  // Calculate upvote and downvote counts
  let upvote_count = 0;
  let downvote_count = 0;
  for (const stat of voteStats) {
    if (stat.vote_type === "upvote") {
      upvote_count = stat._count.vote_type;
    } else if (stat.vote_type === "downvote") {
      downvote_count = stat._count.vote_type;
    }
  }
  const vote_score = upvote_count - downvote_count;
  return {
    id: props.commentId,
    vote_score,
    upvote_count,
    downvote_count,
  };
}
