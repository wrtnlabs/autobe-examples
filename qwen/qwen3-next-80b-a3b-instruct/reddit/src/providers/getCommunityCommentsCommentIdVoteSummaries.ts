import { ICommunityCommentVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVoteSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityCommentsCommentIdVoteSummaries(props: {
  commentId: string;
}): Promise<ICommunityCommentVoteSummary> {
  // First, verify the comment exists and is not deleted
  const comment = await MyGlobal.prisma.community_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, deleted_at: true },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // Then retrieve the vote summary for this comment
  const voteSummary =
    await MyGlobal.prisma.community_comment_vote_summaries.findUnique({
      where: { community_comment_id: props.commentId },
      select: {
        total_upvotes: true,
        total_downvotes: true,
        net_score: true,
      },
    });
  if (!voteSummary) {
    throw new HttpException("Comment not found", 404);
  }
  return {
    total_upvotes: voteSummary.total_upvotes,
    total_downvotes: voteSummary.total_downvotes,
    net_score: voteSummary.net_score,
  };
}
