import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteRedditCloneGuestPostsPostIdCommentsCommentIdVotesVoteId(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the vote by id and verify all relationships
  const vote =
    await MyGlobal.prisma.reddit_clone_comment_votes.findUniqueOrThrow({
      where: {
        id: props.voteId,
      },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_comment_id: true,
        comment: {
          select: {
            id: true,
            reddit_clone_post_id: true,
          },
        },
      },
    });
  // Verify the vote belongs to the specified comment
  if (vote.reddit_clone_comment_id !== props.commentId) {
    throw new HttpException(
      "Vote does not belong to the specified comment",
      404,
    );
  }
  // Verify the comment belongs to the specified post
  if (vote.comment.reddit_clone_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      404,
    );
  }
  // Verify the authenticated guest owns this vote
  if (vote.reddit_clone_member_id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the vote record
  await MyGlobal.prisma.reddit_clone_comment_votes.delete({
    where: { id: props.voteId },
  });
}
