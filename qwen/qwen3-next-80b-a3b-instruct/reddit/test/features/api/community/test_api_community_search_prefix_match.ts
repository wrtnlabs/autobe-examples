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
export async function test_api_community_search_prefix_match(connection: api.IConnection): Promise<void> {
    // Create empty connection for search operation (no authentication required)
    const searchConnection: api.IConnection = { host: connection.host };
    // Perform search with valid IRequest parameters (page, limit, sort only)
    // Since IRequest interface has no query field, we cannot provide a search string
    // We are limited to the provided schema parameters
    const searchResult: IPageICommunityPlatformCommunity.ISummary = await api.functional.communityPlatform.communities.search.index(searchConnection, {
        body: {
            sort: "new",
            page: 1,
            limit: 20
        }
    });
    // Verify response matches expected interface
    typia.assert(searchResult);
    // Verify pagination information is correctly structured
    TestValidator.equals("current page is correct", searchResult.pagination.current, 1);
    TestValidator.equals("limit is correct", searchResult.pagination.limit, 20);
    TestValidator.predicate("records count is non-negative", searchResult.pagination.records >= 0);
    TestValidator.predicate("pages count is non-negative", searchResult.pagination.pages >= 0);
    // Verify each community in data array has required fields
    for (const community of searchResult.data) {
        // Validate name is non-empty string
        TestValidator.predicate("community name is non-empty", community.name.length > 0);
        // Validate description is string and within max length (1000 chars as per ISummary, but spec says 120 for display)
        TestValidator.predicate("description is string", typeof community.description === "string");
        TestValidator.predicate("description length within database limit", community.description.length <= 1000);
        // Validate icon is a valid URI
        TestValidator.predicate("icon is valid URI", /^https?:\/\/.+/.test(community.icon));
        // Validate subscriber_count is a non-negative integer
        TestValidator.predicate("subscriber_count is integer", Number.isInteger(community.subscriber_count));
        TestValidator.predicate("subscriber_count is non-negative", community.subscriber_count >= 0);
        // Validate created_at is ISO 8601 format
        TestValidator.predicate("created_at is valid date-time", /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(community.created_at));
    }
}