import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteRedditCloneMemberPostsPostIdCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the vote and verify it exists
  const vote =
    await MyGlobal.prisma.reddit_clone_comment_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      select: {
        reddit_clone_member_id: true,
        reddit_clone_comment_id: true,
      },
    });
  // Step 2: Verify the authenticated member owns this vote
  if (vote.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify the vote belongs to the specified comment
  if (vote.reddit_clone_comment_id !== props.commentId) {
    throw new HttpException("Not Found", 404);
  }
  // Step 4: Verify the comment belongs to the specified post
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        reddit_clone_post_id: true,
      },
    },
  );
  if (comment.reddit_clone_post_id !== props.postId) {
    throw new HttpException("Not Found", 404);
  }
  // Step 5: Delete the vote record
  await MyGlobal.prisma.reddit_clone_comment_votes.delete({
    where: { id: props.voteId },
  });
}
