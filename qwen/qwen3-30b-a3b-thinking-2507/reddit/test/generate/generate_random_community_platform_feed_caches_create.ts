import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeedCache";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_feed_cache } from "../prepare/prepare_random_community_platform_feed_cache";

export async function generate_random_community_platform_feed_caches_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformFeedCache.ICreate> | undefined;
  },
): Promise<ICommunityPlatformFeedCache> {
  const prepared: ICommunityPlatformFeedCache.ICreate =
    prepare_random_community_platform_feed_cache(props.body);
  const result: ICommunityPlatformFeedCache =
    await api.functional.communityPlatform.feed_caches.create(connection, {
      body: prepared,
    });
  return result;
}
