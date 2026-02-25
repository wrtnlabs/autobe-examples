import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneFeedViewsFeedViewIdRefresh(props: {
  feedViewId: string;
}): Promise<void> {
  const feedView =
    await MyGlobal.prisma.reddit_clone_feed_views.findUniqueOrThrow({
      where: {
        id: props.feedViewId,
      },
    });
  const feedConfig =
    await MyGlobal.prisma.reddit_clone_feed_configs.findUniqueOrThrow({
      where: {
        id: feedView.feed_config_id,
      },
    });
  const feedPosts =
    await MyGlobal.prisma.reddit_clone_feed_views_posts.findMany({
      where: {
        feed_view_id: props.feedViewId,
        contentPost: {
          deleted_at: null,
        },
      },
      orderBy: {
        position: "asc",
      },
      include: {
        contentPost: true,
      },
    });
  const sortedPosts = feedPosts.sort((a, b) => {
    const sortAlgorithm = feedConfig.default_sort_algorithm;
    switch (sortAlgorithm) {
      case "hot": {
        const scoreA = a.contentPost.vote_score;
        const scoreB = b.contentPost.vote_score;
        if (scoreA !== scoreB) return scoreB - scoreA;
        const timeA = new Date(a.contentPost.created_at).getTime();
        const timeB = new Date(b.contentPost.created_at).getTime();
        return timeB - timeA;
      }
      case "new": {
        const timeA = new Date(a.contentPost.created_at).getTime();
        const timeB = new Date(b.contentPost.created_at).getTime();
        return timeB - timeA;
      }
      case "top": {
        const scoreA = a.contentPost.vote_score;
        const scoreB = b.contentPost.vote_score;
        return scoreB - scoreA;
      }
      case "controversial": {
        const totalA =
          (a.contentPost.vote_score > 0 ? a.contentPost.vote_score : 0) +
          (a.contentPost.vote_score < 0
            ? Math.abs(a.contentPost.vote_score)
            : 0);
        const totalB =
          (b.contentPost.vote_score > 0 ? b.contentPost.vote_score : 0) +
          (b.contentPost.vote_score < 0
            ? Math.abs(b.contentPost.vote_score)
            : 0);
        if (totalA < 5 || totalB < 5) return 0;
        const ratioA =
          a.contentPost.vote_score === 0
            ? 0
            : Math.min(
                Math.abs(a.contentPost.vote_score),
                totalA - Math.abs(a.contentPost.vote_score),
              ) /
              Math.max(
                Math.abs(a.contentPost.vote_score),
                totalA - Math.abs(a.contentPost.vote_score),
              );
        const ratioB =
          b.contentPost.vote_score === 0
            ? 0
            : Math.min(
                Math.abs(b.contentPost.vote_score),
                totalB - Math.abs(b.contentPost.vote_score),
              ) /
              Math.max(
                Math.abs(b.contentPost.vote_score),
                totalB - Math.abs(b.contentPost.vote_score),
              );
        return ratioA - ratioB;
      }
      default: {
        return 0;
      }
    }
  });
  for (let i = 0; i < sortedPosts.length; i++) {
    await MyGlobal.prisma.reddit_clone_feed_views_posts.update({
      where: {
        id: sortedPosts[i].id,
      },
      data: {
        position: i,
        updated_at: new Date().toISOString(),
      },
    });
  }
  const lastContentUpdatedAt =
    sortedPosts.length > 0
      ? sortedPosts[0].contentPost.created_at
      : feedView.last_content_updated_at;
  await MyGlobal.prisma.reddit_clone_feed_views.update({
    where: {
      id: props.feedViewId,
    },
    data: {
      is_stale: false,
      last_refreshed_at: new Date().toISOString(),
      last_content_updated_at: lastContentUpdatedAt,
      updated_at: new Date().toISOString(),
    },
  });
}
