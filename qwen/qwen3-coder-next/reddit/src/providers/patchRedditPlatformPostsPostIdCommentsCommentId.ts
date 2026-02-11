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
import { RedditPlatformCommentTransformer } from "../transformers/RedditPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformPostsPostIdCommentsCommentId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditPlatformComment.IUpdate;
}): Promise<IRedditPlatformComment> {
  // Validate that the comment belongs to the specified post
  const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, post_id: true },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  if (comment.post_id !== props.postId)
    throw new HttpException("Comment does not belong to post", 404);
  // Update the comment content and timestamp
  const updated = await MyGlobal.prisma.reddit_platform_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: toISOStringSafe(new Date()),
    },
    ...RedditPlatformCommentTransformer.select(),
  });
  return await RedditPlatformCommentTransformer.transform(updated);
}
