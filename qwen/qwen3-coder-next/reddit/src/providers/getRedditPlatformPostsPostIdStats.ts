import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostViewStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformPostsPostIdStats(props: {
  postId: string;
}): Promise<IRedditPlatformPostViewStat> {
  const stats =
    await MyGlobal.prisma.reddit_platform_post_view_stats.findUnique({
      where: { reddit_platform_post_id: props.postId },
      select: {
        id: true,
        vote_score: true,
        comment_count: true,
        view_count: true,
        content_type: true,
        hot_score: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!stats) {
    throw new HttpException("Post statistics not found", 404);
  }
  return {
    id: stats.id,
    vote_score: stats.vote_score,
    comment_count: stats.comment_count,
    view_count: stats.view_count,
    content_type: stats.content_type,
    hot_score: stats.hot_score,
    created_at: toISOStringSafe(stats.created_at),
    updated_at: toISOStringSafe(stats.updated_at),
  };
}
