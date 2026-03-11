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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeCommentTransformer } from "../transformers/RedditLikeCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeModeratorPostsPostIdComments(props: {
  moderator: ModeratorPayload;
  postId: string;
  body: IRedditLikeComment.ICreate;
}): Promise<IRedditLikeComment> {
  // Find post to verify existence and get necessary info
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Validate comment content is not empty
  if (!props.body.content || props.body.content.trim().length === 0) {
    throw new HttpException("Comment content cannot be empty", 422);
  }
  // Collect comment data using collector
  const commentData = await RedditLikeCommentCollector.collect({
    body: props.body,
    author: { id: props.moderator.id },
    post: { id: props.postId },
  });
  // Create comment with all relations
  const created = await MyGlobal.prisma.reddit_like_comments.create({
    data: commentData,
    ...RedditLikeCommentTransformer.select(),
  });
  // Transform to response DTO
  return await RedditLikeCommentTransformer.transform(created);
}
