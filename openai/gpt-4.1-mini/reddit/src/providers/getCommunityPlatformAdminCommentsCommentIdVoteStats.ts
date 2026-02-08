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

export async function getCommunityPlatformAdminCommentsCommentIdVoteStats(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote.IStat> {
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // User votes counting upvotes and downvotes separately
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
  // Moderator votes counting +1 as upvote and -1 as downvote
  const moderatorUpvotes =
    await MyGlobal.prisma.community_platform_comment_vote_of_moderators.count({
      where: {
        commentVote: { id: props.commentId },
        vote: 1,
        deleted_at: null,
      },
    });
  const moderatorDownvotes =
    await MyGlobal.prisma.community_platform_comment_vote_of_moderators.count({
      where: {
        commentVote: { id: props.commentId },
        vote: -1,
        deleted_at: null,
      },
    });
  // Aggregate totals
  const totalUpvotes = userUpvotes + moderatorUpvotes;
  const totalDownvotes = userDownvotes + moderatorDownvotes;
  const netVotes = totalUpvotes - totalDownvotes;
  return {
    upvotes: totalUpvotes,
    downvotes: totalDownvotes,
    net: netVotes,
  };
}
