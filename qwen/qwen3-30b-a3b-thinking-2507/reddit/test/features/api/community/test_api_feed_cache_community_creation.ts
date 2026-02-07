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

export async function test_api_feed_cache_community_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create feed cache with valid community feed_type
  const feedCache = await generate_random_community_platform_feed_caches_create(
    connection,
    {
      body: {
        feed_type: "community",
        feed_data: typia.random<string>(),
      },
    },
  );
  // Validate the response
  typia.assert(feedCache);
  TestValidator.equals("feed_type matches", feedCache.feed_type, "community");
  TestValidator.predicate(
    "feed_data is not empty",
    feedCache.feed_data.length > 0,
  );
}
