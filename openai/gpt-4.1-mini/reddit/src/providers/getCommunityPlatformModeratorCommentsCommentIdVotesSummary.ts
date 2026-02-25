import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorCommentsCommentIdVotesSummary(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  // Verify comment existence
  await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  // Aggregate votes counts
  const voteCounts =
    await MyGlobal.prisma.community_platform_comment_votes.groupBy({
      by: ["vote_type"],
      where: { comment: { id: props.commentId } },
      _count: { vote_type: true },
    });
  const upvoteObj = voteCounts.find((v) => v.vote_type === "upvote");
  const downvoteObj = voteCounts.find((v) => v.vote_type === "downvote");
  return {
    upvoteCount: upvoteObj?._count?.vote_type ?? 0,
    downvoteCount: downvoteObj?._count?.vote_type ?? 0,
  };
}
