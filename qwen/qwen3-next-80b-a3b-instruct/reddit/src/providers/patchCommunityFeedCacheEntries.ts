import { ICommunityMvFeedCacheEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvFeedCacheEntry";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityMvFeedCacheEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMvFeedCacheEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityFeedCacheEntries(props: {
  body: ICommunityMvFeedCacheEntry.IRequest;
}): Promise<IPageICommunityMvFeedCacheEntry.ISummary> {
  const page = 1; // Default from spec
  const limit = 20; // Default from spec
  const skip = (page - 1) * limit;
  // Determine 30 days ago as string using toISOStringSafe to avoid Date object
  const thirtyDaysAgo = toISOStringSafe(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );
  const whereCondition: Prisma.community_mv_feed_cache_entriesWhereInput = {
    created_at: {
      gte: thirtyDaysAgo,
    },
  };
  const data = await MyGlobal.prisma.community_mv_feed_cache_entries.findMany({
    where: whereCondition,
    orderBy: { last_updated: "desc" },
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.community_mv_feed_cache_entries.count({
    where: whereCondition,
  });
  return {
    data: data.map((entry) => ({
      id: entry.id as string & tags.Format<"uuid">,
      feed_type: entry.feed_type,
      sort_algorithm: entry.sort_algorithm,
      page_token: entry.page_token,
      month_partition: entry.month_partition,
      payload: entry.payload,
      last_updated: toISOStringSafe(entry.last_updated) as string &
        tags.Format<"date-time">,
      created_at: toISOStringSafe(entry.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(entry.updated_at) as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
