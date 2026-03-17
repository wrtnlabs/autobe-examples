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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeCommentTransformer } from "../transformers/RedditLikeCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberPostsPostIdCommentsCommentId(props: {
  member: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IUpdate;
}): Promise<IRedditLikeComment> {
  // Validate content is provided
  if (props.body.content === undefined) {
    throw new HttpException("Content is required", 400);
  }
  // Find comment and verify it exists and belongs to the post
  const comment = await MyGlobal.prisma.reddit_like_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      content: true,
      post_id: true,
      author_id: true,
    },
  });
  if (comment === null || comment.post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  // Verify user is the author
  if (comment.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Create snapshot for audit trail
  const createdAt = new Date();
  await MyGlobal.prisma.reddit_like_comment_snapshots.create({
    data: {
      id: v4(),
      comment: { connect: { id: comment.id } },
      body: comment.content,
      created_at: createdAt,
    },
  });
  // Update the comment
  await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      is_edited: true,
      updated_at: createdAt,
    },
  });
  // Fetch updated comment with full relations for response
  const updatedComment =
    await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...RedditLikeCommentTransformer.select(),
    });
  return await RedditLikeCommentTransformer.transform(updatedComment);
}
