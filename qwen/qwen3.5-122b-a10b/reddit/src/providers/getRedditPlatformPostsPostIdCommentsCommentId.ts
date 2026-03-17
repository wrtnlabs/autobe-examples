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

export async function getRedditPlatformPostsPostIdCommentsCommentId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformComment> {
  const comment =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        ...RedditPlatformCommentTransformer.select().select,
        reddit_platform_post_id: true,
      },
    });
  if (comment.reddit_platform_post_id !== props.postId) {
    throw new HttpException("Comment not found in specified post", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  return await RedditPlatformCommentTransformer.transform(comment);
}
