import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityPlatformAdminPostsPostIdCommentsCommentId(props: {
  platformAdmin: PlatformadminPayload;
  postId: string;
  commentId: string;
}): Promise<void> {
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { post_id: true, deleted_at: true },
    });
  if (comment.deleted_at !== null) {
    return;
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: { deleted_at: now },
  });
  await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: comment.post_id },
    data: { comment_count: { decrement: 1 } },
  });
}
