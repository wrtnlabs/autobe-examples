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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeCommentTransformer } from "../transformers/RedditLikeCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeModeratorCommentsCommentId(props: {
  moderator: ModeratorPayload;
  commentId: string;
  body: IRedditLikeComment.IUpdate;
}): Promise<IRedditLikeComment> {
  // Load target comment
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: { id: true, author_id: true, deleted_at: true },
  });
  // Verify comment exists and is not deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // Verify authenticated user is comment author
  if (comment.author_id !== props.moderator.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update content and timestamp using Prisma's database function
  const updated = await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
    ...RedditLikeCommentTransformer.select(),
  });
  return await RedditLikeCommentTransformer.transform(updated);
}
