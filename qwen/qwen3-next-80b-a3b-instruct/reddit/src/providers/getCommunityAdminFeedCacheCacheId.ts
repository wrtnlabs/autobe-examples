import { ICommunityMvFeedCacheEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvFeedCacheEntry";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminFeedCacheCacheId(props: {
  admin: AdminPayload;
  cacheId: string & tags.Format<"uuid">;
}): Promise<ICommunityMvFeedCacheEntry> {
  const cacheEntry =
    await MyGlobal.prisma.community_mv_feed_cache_entries.findUnique({
      where: { id: props.cacheId },
    });
  if (!cacheEntry) {
    throw new HttpException("Cache entry not found", 404);
  }
  return {
    payload: cacheEntry.payload,
  };
}
