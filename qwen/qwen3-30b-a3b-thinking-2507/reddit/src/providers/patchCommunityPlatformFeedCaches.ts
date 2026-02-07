import { ICommunityPlatformFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeedCache";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeedCache";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFeedCacheAtSummaryTransformer } from "../transformers/CommunityPlatformFeedCacheAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformFeedCaches(props: {
  body: ICommunityPlatformFeedCache.IRequest;
}): Promise<IPageICommunityPlatformFeedCache.ISummary> {
  const { page = 1, limit = 100, feed_type } = props.body;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_platform_feed_caches.findMany({
    where: { feed_type, deleted_at: null },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityPlatformFeedCacheAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_feed_caches.count({
    where: { feed_type, deleted_at: null },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformFeedCacheAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
