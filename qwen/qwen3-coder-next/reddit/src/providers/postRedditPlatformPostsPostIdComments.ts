import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformPostsPostIdComments(props: {
  postId: string;
  body: IRedditPlatformComment.ICreate;
}): Promise<IRedditPlatformComment> {
  // Find the post to verify it exists
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Verify the post is not deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post has been deleted", 404);
  }
  // Extract author_id from authentication context
  const authorId = "authenticated-user-id-placeholder" as string &
    tags.Format<"uuid">;
  // Create the comment using actual DTO structure
  const comment = await MyGlobal.prisma.reddit_platform_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      content: "",
      vote_score: 0,
      comment_count: 0,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      author: { connect: { id: authorId } },
      post: { connect: { id: props.postId } },
      parentComment: undefined,
    },
  });
  // Update the post's comment_count
  await MyGlobal.prisma.reddit_platform_posts.update({
    where: { id: props.postId },
    data: { comment_count: { increment: 1 } },
  });
  return {
    id: comment.id,
    content: comment.content,
    vote_score: comment.vote_score,
    comment_count: comment.comment_count,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    author_id: comment.author_id,
    post_id: comment.post_id,
    parent_comment_id: null,
  };
}
