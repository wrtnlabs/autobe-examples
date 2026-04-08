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

export async function deleteRedditLikeMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the comment and verify it exists
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      reddit_like_member_id: true,
      reddit_like_post_id: true,
      deleted_at: true,
    },
  });
  // Step 2: Verify comment is not already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // Step 3: Verify comment belongs to the specified post
  if (comment.reddit_like_post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  // Step 4: Fetch the post to get community information
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_like_community_id: true,
    },
  });
  // Step 5: Authorization check
  const isCommentOwner = comment.reddit_like_member_id === props.member.id;
  if (isCommentOwner) {
    // Comment owner can delete their own comment
    await MyGlobal.prisma.reddit_like_comments.update({
      where: { id: props.commentId },
      data: {
        deleted_at: new Date(),
      },
    });
    return;
  }
  // Step 6: Check if member is community owner
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { id: post.reddit_like_community_id },
    select: { owner_id: true },
  });
  if (community?.owner_id === props.member.id) {
    // Community owner can delete any comment
    await MyGlobal.prisma.reddit_like_comments.update({
      where: { id: props.commentId },
      data: {
        deleted_at: new Date(),
      },
    });
    return;
  }
  // Step 7: Check if member is community moderator
  const isModerator =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        reddit_like_community_id: post.reddit_like_community_id,
        reddit_like_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (isModerator) {
    // Moderator can delete any comment in their community
    await MyGlobal.prisma.reddit_like_comments.update({
      where: { id: props.commentId },
      data: {
        deleted_at: new Date(),
      },
    });
    return;
  }
  // Step 8: Not authorized
  throw new HttpException("Forbidden", 403);
}
