import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeedCache";
import { prepare_random_community_platform_feed_cache } from "../../../prepare/prepare_random_community_platform_feed_cache";
import { generate_random_community_platform_feed_caches_create } from "../../../generate/generate_random_community_platform_feed_caches_create";
export async function test_api_feed_cache_popular_creation(connection: api.IConnection): Promise<void> {
    // Create actor-specific connection
    const userConnection: api.IConnection = { host: connection.host };
    // Generate feed cache entry with 'popular' feed_type
    const cache = await generate_random_community_platform_feed_caches_create(userConnection, {
        body: {
            feed_type: "popular",
            feed_data: RandomGenerator.content({
                paragraphs: 3,
                sentenceMin: 5,
                sentenceMax: 10
            }),
        } satisfies ICommunityPlatformFeedCache.ICreate,
    });
    // Validate response structure
    typia.assert(cache);
    // Verify feed type matches expected value
    TestValidator.equals("Feed type should be 'popular'", cache.feed_type, "popular");
}