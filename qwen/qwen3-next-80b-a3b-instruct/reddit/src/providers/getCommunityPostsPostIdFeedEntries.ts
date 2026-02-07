import { ICommunityPostFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostFeed";
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

export async function getCommunityPostsPostIdFeedEntries(props: {
  postId: string;
}): Promise<ICommunityPostFeed> {
  const feedEntries = await MyGlobal.prisma.community_post_feeds.findMany({
    where: {
      community_post_id: props.postId,
      post: {
        status: {
          status: { not: "deleted" },
        },
      },
    },
    include: {
      post: {
        select: {
          status: {
            select: {
              status: true,
            },
          },
          // Removed community: { select: { deleted_at: true } } because deleted_at is not a valid property in community_communitiesSelect<DefaultArgs>
        },
      },
    },
    orderBy: [{ feed_type: "asc" }, { sort_algorithm: "asc" }],
  });
  // Return empty array if no entries found
  if (feedEntries.length === 0) {
    return {} as ICommunityPostFeed;
  }
  // Transform each entry to ICommunityPostFeed format
  return feedEntries.map((entry) => ({
    feed_type: entry.feed_type,
    sort_algorithm: entry.sort_algorithm,
    created_at: toISOStringSafe(entry.created_at),
    last_updated: toISOStringSafe(entry.last_updated),
  })) as ICommunityPostFeed;
}
