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
import { RedditLikeCommentTransformer } from "../transformers/RedditLikeCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikePostsPostIdCommentsCommentId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeComment> {
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    ...RedditLikeCommentTransformer.select(),
  });
  if (comment.post_id !== props.postId) {
    throw new HttpException("Comment not found for this post", 404);
  }
  const replies = await MyGlobal.prisma.reddit_like_comments.findMany({
    where: {
      parent_id: props.commentId,
      is_deleted: false,
    },
    ...RedditLikeCommentTransformer.select(),
    orderBy: { created_at: "asc" },
  });
  const transformedComment =
    await RedditLikeCommentTransformer.transform(comment);
  const transformedReplies = await ArrayUtil.asyncMap(
    replies,
    RedditLikeCommentTransformer.transform,
  );
  return {
    ...transformedComment,
    replies: transformedReplies,
  };
}
