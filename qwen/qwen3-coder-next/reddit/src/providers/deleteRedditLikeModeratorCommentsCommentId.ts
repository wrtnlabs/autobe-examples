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
  commentId: string;
}): Promise<void> {
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      post_id: true,
      author_id: true,
    },
  });
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: comment.post_id },
    select: { id: true, community_id: true },
  });
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: post.community_id,
        role: { in: ["owner", "moderator"] },
      },
    });
  const isOwner = comment.author_id === props.moderator.id;
  if (!isOwner && moderatorRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_like_comments.delete({
      where: { id: props.commentId },
    }),
    MyGlobal.prisma.reddit_like_posts.update({
      where: { id: comment.post_id },
      data: {
        comment_count: { decrement: 1 },
      },
    }),
  ]);
}
