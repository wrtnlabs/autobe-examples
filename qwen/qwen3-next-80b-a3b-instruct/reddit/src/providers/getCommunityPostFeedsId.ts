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

export async function getCommunityPostFeedsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPostFeed> {
  const feed = await MyGlobal.prisma.community_post_feeds.findUnique({
    where: { id: props.id },
    include: {
      post: {
        select: { deleted_at: true },
      },
    },
  });
  if (!feed || feed.post.deleted_at !== null) {
    throw new HttpException("Post feed not found or post is deleted", 404);
  }
  return {
    feed_type: feed.feed_type,
    sort_algorithm: feed.sort_algorithm,
    created_at: toISOStringSafe(feed.created_at),
    last_updated: toISOStringSafe(feed.last_updated),
  };
}
