import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeModeratorCommentsCommentId(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(new Date());
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      author_id: true,
      post_id: true,
      deleted_at: true,
    },
  });
  if (comment.author_id !== props.moderator.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (comment.deleted_at !== null) {
    return;
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_like_comments.update({
      where: { id: props.commentId },
      data: {
        deleted_at: now,
      },
    }),
    MyGlobal.prisma.reddit_like_posts.update({
      where: { id: comment.post_id },
      data: {
        comment_count: { decrement: 1 },
      },
    }),
  ]);
}
