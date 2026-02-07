import { ICommunityPlatformFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeedCache";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFeedCacheTransformer } from "../transformers/CommunityPlatformFeedCacheTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformFeedCachesId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformFeedCache> {
  const cache = await MyGlobal.prisma.community_platform_feed_caches.findUnique(
    {
      where: { id: props.id, deleted_at: null },
      ...CommunityPlatformFeedCacheTransformer.select(),
    },
  );
  if (!cache) {
    throw new HttpException("Feed cache not found", 404);
  }
  return await CommunityPlatformFeedCacheTransformer.transform(cache);
}
