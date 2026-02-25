import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
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

export async function patchRedditCloneModeratorFeedViewsFeedViewIdRefresh(props: {
  moderator: ModeratorPayload;
  feedViewId: string;
}): Promise<IRedditCloneFeedView.IRefreshResponse> {
  const feedView =
    await MyGlobal.prisma.reddit_clone_feed_views.findUniqueOrThrow({
      where: { id: props.feedViewId as string & tags.Format<"uuid"> },
      include: { feedConfig: true },
    });
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const feedViewId = props.feedViewId as string & tags.Format<"uuid">;
  const posts = await MyGlobal.prisma.reddit_clone_content_posts.findMany({
    where: { deleted_at: null },
    orderBy: [{ created_at: "desc" }],
    take: 100,
  });
  await MyGlobal.prisma.reddit_clone_feed_views_posts.deleteMany({
    where: { feed_view_id: feedViewId },
  });
  const feedViewPosts = posts.map((post, index) => ({
    id: v4() as string & tags.Format<"uuid">,
    feed_view_id: feedViewId,
    content_post_id: post.id,
    position: index,
    created_at: now,
    updated_at: now,
  }));
  if (feedViewPosts.length > 0) {
    await MyGlobal.prisma.reddit_clone_feed_views_posts.createMany({
      data: feedViewPosts,
    });
  }
  const lastContentUpdatedAt =
    posts.length > 0
      ? (posts[0].created_at.toISOString() as string & tags.Format<"date-time">)
      : null;
  await MyGlobal.prisma.reddit_clone_feed_views.update({
    where: { id: feedViewId },
    data: {
      is_stale: false,
      last_refreshed_at: now,
      last_content_updated_at: lastContentUpdatedAt,
    },
  });
  return {
    success: "refreshed",
    feedViewId: feedViewId,
  };
}
