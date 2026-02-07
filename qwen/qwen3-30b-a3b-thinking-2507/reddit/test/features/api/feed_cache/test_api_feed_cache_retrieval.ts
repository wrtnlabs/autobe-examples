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

export async function test_api_feed_cache_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Create feed cache with home feed_type using utility function
  const feedCache = await generate_random_community_platform_feed_caches_create(
    adminConnection,
    {
      body: {
        feed_type: "home",
        feed_data: JSON.stringify({
          items: ArrayUtil.repeat(3, () => ({
            id: RandomGenerator.alphaNumeric(8),
            content: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 3,
              sentenceMax: 5,
            }),
          })),
          metadata: {
            version: 1,
            timestamp: new Date().toISOString(),
          },
        }),
      },
    },
  );
  // Verify cache creation
  typia.assert(feedCache);
  // Retrieve the feed cache using ID
  const retrievedFeedCache =
    await api.functional.communityPlatform.feed_caches.at(adminConnection, {
      id: feedCache.id,
    });
  // Verify retrieved cache
  typia.assert(retrievedFeedCache);
  // Basic validations
  TestValidator.equals(
    "feed_type matches",
    retrievedFeedCache.feed_type,
    "home",
  );
  const feedData = JSON.parse(retrievedFeedCache.feed_data);
  TestValidator.predicate("feed_data has 3 items", feedData.items.length === 3);
  TestValidator.equals("feed_data version", feedData.metadata.version, 1);
  TestValidator.equals(
    "feed_data timestamp",
    feedData.metadata.timestamp,
    retrievedFeedCache.updated_at,
  );
}
