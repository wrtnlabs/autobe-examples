import { ICommunityPlatformFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeedCache";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFeedCacheCollector } from "../collectors/CommunityPlatformFeedCacheCollector";
import { CommunityPlatformFeedCacheTransformer } from "../transformers/CommunityPlatformFeedCacheTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformFeedCaches(props: {
  body: ICommunityPlatformFeedCache.ICreate;
}): Promise<ICommunityPlatformFeedCache> {
  const created = await MyGlobal.prisma.community_platform_feed_caches.create({
    data: await CommunityPlatformFeedCacheCollector.collect({
      body: props.body,
    }),
  });
  return await CommunityPlatformFeedCacheTransformer.transform(created);
}
