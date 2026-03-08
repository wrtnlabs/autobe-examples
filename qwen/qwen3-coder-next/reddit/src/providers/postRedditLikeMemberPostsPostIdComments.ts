import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Find post and verify it exists and is not deleted
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, comment_count: true },
  });
  // If parent_comment_id provided, verify it belongs to same post
  if (props.body.parent_comment_id) {
    const parentComment = await MyGlobal.prisma.reddit_like_comments.findUnique(
      {
        where: { id: props.body.parent_comment_id },
        select: { post_id: true },
      },
    );
    if (!parentComment || parentComment.post_id !== props.postId) {
      throw new HttpException(
        "Parent comment does not belong to this post",
        400,
      );
    }
  }
  // Create comment using collector
  const created = await MyGlobal.prisma.reddit_like_comments.create({
    data: await RedditLikeCommentCollector.collect({
      body: props.body,
      member: { id: props.member.id },
      post: { id: props.postId },
    }),
    ...RedditLikeCommentTransformer.select(),
  });
  // Increment post's comment count
  await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: props.postId },
    data: { comment_count: post.comment_count + 1 },
  });
  // Transform to response DTO
  return await RedditLikeCommentTransformer.transform(created);
}
