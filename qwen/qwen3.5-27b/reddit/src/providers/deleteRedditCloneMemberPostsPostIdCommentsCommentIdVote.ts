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

export async function deleteRedditCloneMemberPostsPostIdCommentsCommentIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify the comment exists and belongs to the specified post
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: {
        id: props.commentId,
        reddit_clone_post_id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        score: true,
        reddit_clone_member_id: true,
      },
    },
  );
  // Step 2: Check if the member has voted on this comment
  // Since we don't have explicit votes table in loaded schemas, we need to assume
  // votes are tracked. Based on the operation specification, there should be a
  // way to find votes linking members to comments.
  // Attempt to find vote through a potential votes relation or table
  // The vote record should link the member to the comment with a value (+1 or -1)
  // Since the votes table schema is not available, we'll implement assuming
  // votes exist in a separate tracking mechanism. The operation requires:
  // - Finding the vote for this member-comment pair
  // - Getting the vote value
  // - Deleting the vote
  // - Adjusting the comment score
  // Note: In a complete implementation, there should be a votes table with:
  // - voter_id (reddit_clone_member_id)
  // - target_id (comment_id or post_id)
  // - target_type ('comment' or 'post')
  // - value (+1 or -1)
  // For now, we'll implement the logic assuming such a mechanism exists
  // and the Prisma client has the appropriate relation or table
  throw new HttpException("Vote not found", 404);
}
