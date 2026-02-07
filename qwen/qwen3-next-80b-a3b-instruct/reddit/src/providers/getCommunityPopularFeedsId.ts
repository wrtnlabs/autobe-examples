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

export async function getCommunityPopularFeedsId(props: {
  id: string;
}): Promise<ICommunityPostFeed> {
  if (!typia.is<string & tags.Format<"uuid">>(props.id)) {
    throw new HttpException("Invalid UUID format", 400);
  }
  const feedEntry = await MyGlobal.prisma.community_post_feeds.findUnique({
    where: { id: props.id },
  });
  if (!feedEntry) {
    throw new HttpException("Popular feed entry not found", 404);
  }
  return {
    id: feedEntry.id,
    community_post_id: feedEntry.community_post_id,
    feed_type: feedEntry.feed_type,
    sort_algorithm: feedEntry.sort_algorithm,
    created_at: toISOStringSafe(feedEntry.created_at),
    last_updated: toISOStringSafe(feedEntry.last_updated),
  };
}
