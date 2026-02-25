import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommentsCommentIdVotesSummary(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  // Verify the comment exists or throw 404
  await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  // Aggregate votes grouped by vote_type
  const groupedVotes =
    await MyGlobal.prisma.community_platform_comment_votes.groupBy({
      by: ["vote_type"],
      where: { community_platform_comment_id: props.commentId },
      _count: { vote_type: true },
    });
  // Initialize counts to zero
  let upvoteCount = 0;
  let downvoteCount = 0;
  // Assign counts based on vote_type
  for (const item of groupedVotes) {
    if (item.vote_type === "upvote") {
      upvoteCount = item._count.vote_type;
    } else if (item.vote_type === "downvote") {
      downvoteCount = item._count.vote_type;
    }
  }
  return {
    upvoteCount,
    downvoteCount,
  };
}
