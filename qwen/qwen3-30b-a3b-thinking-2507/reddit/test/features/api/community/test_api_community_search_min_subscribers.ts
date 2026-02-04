import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
export async function test_api_community_search_min_subscribers(connection: api.IConnection): Promise<void> {
    // Perform search with minSubscriberCount=50
    const response = await api.functional.communityPlatform.communities.search.index(connection, {
        body: {
            minSubscriberCount: 50,
        } satisfies ICommunityPlatformCommunity.IRequest
    });
    typia.assert(response);
    // Verify search results contain only communities with 50+ subscribers
    const validCommunities = response.data.filter(community => community.subscriber_count >= 50);
    TestValidator.equals("search response should only contain communities with 50+ subscribers", validCommunities.length, response.data.length);
    // Ensure at least one valid community is returned
    TestValidator.predicate("at least one community with 50+ subscribers should be returned", validCommunities.length > 0);
}