import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformUserCommentsCommentIdVisibility(props: {
  user: UserPayload;
  commentId: string;
  body: IRedditPlatformComment.IVisibilityRequest;
}): Promise<IRedditPlatformComment> {
  // Find the comment
  const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
    where: { id: props.commentId as string & tags.Format<"uuid"> },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Update visibility by setting/removing deleted_at timestamp
  const updated = await MyGlobal.prisma.reddit_platform_comments.update({
    where: { id: props.commentId as string & tags.Format<"uuid"> },
    data: {
      deleted_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  // Return updated comment with proper type conversion
  return {
    id: updated.id,
    author_id: updated.author_id,
    post_id: updated.post_id,
    parent_comment_id: updated.parent_comment_id,
    content: updated.content,
    vote_score: updated.vote_score,
    comment_count: updated.comment_count,
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: updated.deleted_at
      ? (toISOStringSafe(updated.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
  };
}
