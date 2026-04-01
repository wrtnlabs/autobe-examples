import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeCommentAtThreadTransformer } from "../transformers/RedditLikeCommentAtThreadTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeOwnerPostsPostIdCommentsThread(props: {
  owner: OwnerPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeComment.IThread> {
  // Verify post exists
  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Get top-level comments for this post
  const comments = await MyGlobal.prisma.reddit_like_comments.findMany({
    where: {
      post_id: props.postId,
      parent_id: null,
    },
    ...RedditLikeCommentAtThreadTransformer.select(),
    orderBy: {
      vote_score: "desc",
    },
  });
  if (comments.length === 0) {
    throw new HttpException("No comments found for this post", 404);
  }
  // Return the first (highest voted) comment thread
  return await RedditLikeCommentAtThreadTransformer.transform(comments[0]);
}
