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
import { RedditLikeCommentCollector } from "../collectors/RedditLikeCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommentTransformer } from "../transformers/RedditLikeCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.ICreate;
}): Promise<IRedditLikeComment> {
  // Verify post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      is_deleted: true,
    },
  });
  if (post.is_deleted) {
    throw new HttpException("Post has been deleted", 404);
  }
  // If parentId provided, validate parent comment exists and belongs to same post
  if (props.body.parentId !== undefined && props.body.parentId !== null) {
    const parentComment = await MyGlobal.prisma.reddit_like_comments.findUnique(
      {
        where: { id: props.body.parentId },
        select: {
          id: true,
          post_id: true,
          is_deleted: true,
        },
      },
    );
    if (parentComment === null) {
      throw new HttpException("Parent comment not found", 404);
    }
    if (parentComment.is_deleted) {
      throw new HttpException("Parent comment has been deleted", 400);
    }
    if (parentComment.post_id !== props.postId) {
      throw new HttpException(
        "Parent comment does not belong to this post",
        400,
      );
    }
  }
  // Create the comment using collector
  const commentData = await RedditLikeCommentCollector.collect({
    body: props.body,
    redditLikePosts: { id: props.postId },
    redditLikeMembers: { id: props.member.id },
  });
  const created = await MyGlobal.prisma.reddit_like_comments.create({
    data: commentData,
  });
  // Fetch full comment with relations using transformer select
  const commentWithRelations =
    await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
      where: { id: created.id },
      ...RedditLikeCommentTransformer.select(),
    });
  return await RedditLikeCommentTransformer.transform(commentWithRelations);
}
