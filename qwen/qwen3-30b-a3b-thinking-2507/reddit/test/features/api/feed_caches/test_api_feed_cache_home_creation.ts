import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeedCache";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_community_platform_feed_caches_create } from "../../../generate/generate_random_community_platform_feed_caches_create";
import { prepare_random_community_platform_feed_cache } from "../../../prepare/prepare_random_community_platform_feed_cache";

export async function test_api_feed_cache_home_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection object for the utility
  const cacheConnection: api.IConnection = { host: connection.host };
  // Create the feed cache using the utility function
  const feedCache = await generate_random_community_platform_feed_caches_create(
    cacheConnection,
    {
      body: {
        feed_type: "home",
      },
    },
  );
  // Validate the response type
  typia.assert(feedCache);
  // Validate the feed_type
  TestValidator.equals("feed type should be home", feedCache.feed_type, "home");
}
