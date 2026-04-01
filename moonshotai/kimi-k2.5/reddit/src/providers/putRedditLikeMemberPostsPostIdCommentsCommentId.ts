import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommentTransformer } from "../transformers/RedditLikeCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IUpdate;
}): Promise<IRedditLikeComment> {
  // 1. Verify the comment exists and belongs to the specified post
  const comment = await MyGlobal.prisma.reddit_like_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, post_id: true, author_id: true, content: true },
  });
  if (comment === null || comment.post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  // 2. Verify the authenticated user is the comment author
  if (comment.author_id !== props.member.id) {
    throw new HttpException(
      "Forbidden - only the author can update this comment",
      403,
    );
  }
  // 3. Check if user is banned from the community where the post resides
  // Note: reddit_like_bans table does not exist in schema - skipping ban check
  // Need to get community_id from the post first
  const post = await MyGlobal.prisma.reddit_like_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, community_id: true, is_deleted: true },
  });
  if (post === null || post.is_deleted) {
    throw new HttpException("Post not found or deleted", 404);
  }
  // 4. If content is being updated, create a snapshot of the previous content
  if (props.body.content !== undefined) {
    // Create snapshot for audit trail
    await MyGlobal.prisma.reddit_like_comment_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        comment_id: comment.id,
        body: comment.content,
        created_at: new Date(),
      },
    });
  }
  // 5. Update the comment with new content
  await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: props.commentId },
    data: {
      ...(props.body.content !== undefined && { content: props.body.content }),
      is_edited: true,
      updated_at: new Date(),
    },
  });
  // 6. Return the updated comment using the transformer
  const updatedComment =
    await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...RedditLikeCommentTransformer.select(),
    });
  return await RedditLikeCommentTransformer.transform(updatedComment);
}
