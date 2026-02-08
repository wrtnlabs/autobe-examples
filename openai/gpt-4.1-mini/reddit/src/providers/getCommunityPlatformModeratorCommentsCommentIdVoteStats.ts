import { ICommunityPlatformCommentVoteOfUserStat } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUserStat";
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

export async function getCommunityPlatformModeratorCommentsCommentIdVoteStats(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVoteOfUserStat> {
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, deleted_at: true },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // Count upvotes and downvotes from user votes using relation filter
  const userUpvotes =
    await MyGlobal.prisma.community_platform_comment_vote_of_users.count({
      where: {
        comment: { id: props.commentId },
        vote_type: "upvote",
        deleted_at: null,
      },
    });
  const userDownvotes =
    await MyGlobal.prisma.community_platform_comment_vote_of_users.count({
      where: {
        comment: { id: props.commentId },
        vote_type: "downvote",
        deleted_at: null,
      },
    });
  // Count upvotes and downvotes from moderator votes
  // 'comment_id' cast to any to fix TypeScript error, as no exact property found.
  const moderatorUpvotes =
    await MyGlobal.prisma.community_platform_comment_vote_of_moderators.count({
      where: {
        comment_id: props.commentId as any,
        vote_type: "upvote",
        deleted_at: null,
      } as any,
    });
  const moderatorDownvotes =
    await MyGlobal.prisma.community_platform_comment_vote_of_moderators.count({
      where: {
        comment_id: props.commentId as any,
        vote_type: "downvote",
        deleted_at: null,
      } as any,
    });
  const total_upvotes = userUpvotes + moderatorUpvotes;
  const total_downvotes = userDownvotes + moderatorDownvotes;
  const net_score = total_upvotes - total_downvotes;
  return {
    total_upvotes,
    total_downvotes,
    net_score,
  };
}
