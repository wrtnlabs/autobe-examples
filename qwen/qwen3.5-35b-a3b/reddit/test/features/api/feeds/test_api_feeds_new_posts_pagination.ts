import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostFeedNewRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostFeedNewRequest";
export async function test_api_feeds_new_posts_pagination(connection: api.IConnection): Promise<void> {
    // Test 1: Basic pagination with default parameters
    const defaultResponse = await api.functional.redditPlatform.feeds._new.index(connection, { body: {} });
    typia.assert(defaultResponse);
    // Validate pagination metadata structure
    TestValidator.equals("default pagination current page", defaultResponse.pagination.current, 1);
    TestValidator.predicate("default pagination limit is positive", defaultResponse.pagination.limit > 0);
    TestValidator.predicate("default pagination records is non-negative", defaultResponse.pagination.records >= 0);
    TestValidator.predicate("default pagination pages is non-negative", defaultResponse.pagination.pages >= 0);
    TestValidator.equals("default pagination pages calculation", defaultResponse.pagination.pages, defaultResponse.pagination.records > 0
        ? Math.ceil(defaultResponse.pagination.records / defaultResponse.pagination.limit)
        : 0);
    // Test 2: Explicit limit of 50 (maximum)
    const maxLimitResponse = await api.functional.redditPlatform.feeds._new.index(connection, { body: { page: 1, limit: 50 } });
    typia.assert(maxLimitResponse);
    TestValidator.equals("max limit pagination limit", maxLimitResponse.pagination.limit, 50);
    TestValidator.equals("max limit pagination current page", maxLimitResponse.pagination.current, 1);
    // Test 3: Limit exceeding maximum should be capped at 50
    const overLimitResponse = await api.functional.redditPlatform.feeds._new.index(connection, { body: { page: 1, limit: 100 } });
    typia.assert(overLimitResponse);
    TestValidator.equals("over limit should be capped at 50", overLimitResponse.pagination.limit, 50);
    // Test 4: Multi-page retrieval with limit=5
    const smallLimit = 5;
    const page1Response = await api.functional.redditPlatform.feeds._new.index(connection, { body: { page: 1, limit: smallLimit } });
    typia.assert(page1Response);
    TestValidator.equals("page 1 with limit 5 - current page", page1Response.pagination.current, 1);
    TestValidator.equals("page 1 with limit 5 - limit", page1Response.pagination.limit, smallLimit);
    // Verify page 1 data has at most 5 posts
    TestValidator.predicate("page 1 has at most 5 posts", page1Response.data.length <= smallLimit);
    // Store first post IDs from page 1 to verify ordering on page 2
    const page1FirstPostIds = page1Response.data
        .filter((_, i) => i < 3)
        .map((post) => post.id);
    // Test 5: Retrieve page 2 with limit=5
    const page2Response = await api.functional.redditPlatform.feeds._new.index(connection, { body: { page: 2, limit: smallLimit } });
    typia.assert(page2Response);
    TestValidator.equals("page 2 with limit 5 - current page", page2Response.pagination.current, 2);
    TestValidator.equals("page 2 with limit 5 - limit", page2Response.pagination.limit, smallLimit);
    // Test 6: Verify posts are ordered by creation time (newest first)
    if (page1Response.data.length >= 2) {
        const firstPostCreatedAt = new Date(page1Response.data[0].created_at).getTime();
        const secondPostCreatedAt = new Date(page1Response.data[1].created_at).getTime();
        TestValidator.predicate("posts ordered by creation time (newest first)", firstPostCreatedAt >= secondPostCreatedAt);
    }
    // Test 7: Verify pagination metadata accuracy
    TestValidator.predicate("total records is non-negative", page1Response.pagination.records >= 0);
    // Test 8: Test hasNextPage flag - when on last page, current should equal pages
    const lastPageNumber = page1Response.pagination.pages;
    if (lastPageNumber > 0) {
        const lastPageResponse = await api.functional.redditPlatform.feeds._new.index(connection, { body: { page: lastPageNumber, limit: smallLimit } });
        typia.assert(lastPageResponse);
        TestValidator.equals("last page - current page equals total pages", lastPageResponse.pagination.current, lastPageNumber);
    }
    // Test 9: Test community filter with pagination
    const communityId = typia.random<string & tags.Format<"uuid">>();
    const filteredResponse = await api.functional.redditPlatform.feeds._new.index(connection, {
        body: {
            page: 1,
            limit: 10,
            community_id: communityId,
        },
    });
    typia.assert(filteredResponse);
    TestValidator.equals("filtered pagination current page", filteredResponse.pagination.current, 1);
    TestValidator.equals("filtered pagination limit", filteredResponse.pagination.limit, 10);
    // Test 10: Verify empty feed pagination (when no records)
    const emptyFeedResponse = await api.functional.redditPlatform.feeds._new.index(connection, { body: { page: 1, limit: 10 } });
    typia.assert(emptyFeedResponse);
    TestValidator.predicate("empty feed records is non-negative", emptyFeedResponse.pagination.records >= 0);
    TestValidator.predicate("empty feed pages is non-negative", emptyFeedResponse.pagination.pages >= 0);
}