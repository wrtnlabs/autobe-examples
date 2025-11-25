import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityForumUserCommentsCommentIdVotesVoteId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, check if the vote exists and belongs to the current user
  const vote = await MyGlobal.prisma.community_forum_comment_votes.findUnique({
    where: {
      id: props.voteId,
      community_forum_user_id: props.user.id,
      community_forum_comment_id: props.commentId,
    },
  });

  // If vote doesn't exist or doesn't belong to the user, throw an error
  if (!vote) {
    throw new HttpException(
      "Vote not found or you don't have permission to delete it",
      404,
    );
  }

  // Check if the comment exists
  const comment = await MyGlobal.prisma.community_forum_comments.findUnique({
    where: {
      id: props.commentId,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Delete the vote
  await MyGlobal.prisma.community_forum_comment_votes.delete({
    where: {
      id: props.voteId,
    },
  });
}
