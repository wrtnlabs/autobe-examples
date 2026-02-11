import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommentTransformer } from "../transformers/RedditPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string;
  commentId: string;
  body: IRedditPlatformComment.IUpdate;
}): Promise<IRedditPlatformComment> {
  // Check if comment exists and belongs to the specified post
  const existingComment =
    await MyGlobal.prisma.reddit_platform_comments.findFirst({
      where: {
        id: props.commentId,
        post_id: props.postId,
      },
    });
  if (!existingComment) {
    throw new HttpException("Comment not found", 404);
  }
  // Authorization check
  // 1. Comment author can edit their own comment
  // 2. Moderators can edit any comment in their community
  // 3. Admins can edit any comment
  // Get post to determine its community
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Check if user is comment author
  const isAuthor = existingComment.author_id === props.member.id;
  // Check if user is moderator of the community
  const isModerator =
    await MyGlobal.prisma.reddit_platform_moderations.findFirst({
      where: {
        user_id: props.member.id,
        community_id: post.community_id,
      },
    });
  // No need to check for admin since MemberPayload doesn't have hasAdminRole
  // The authorization allows moderators to edit any comment in their community
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Update comment content and updated_at timestamp
  const updatedComment = await MyGlobal.prisma.reddit_platform_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return updated comment with transformer - include author relation
  const commentWithAuthor =
    await MyGlobal.prisma.reddit_platform_comments.findUnique({
      where: { id: props.commentId },
      include: {
        author: true,
      },
    });
  if (!commentWithAuthor) {
    throw new HttpException("Comment not found", 404);
  }
  return await RedditPlatformCommentTransformer.transform(commentWithAuthor);
}
