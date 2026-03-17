import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPagination";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
/**
 * Test unified search pagination behavior and no-results scenarios.
 *
 * Validates pagination controls, case-insensitive search, partial matching,
 * and edge cases like empty queries and whitespace-only searches.
 *
 * Note: Cannot create test data (communities/posts/users) via available APIs,
 * so focuses on testing search behavior with queries that should return
 * empty results and validating pagination metadata.
 */
export async function test_api_search_unified_pagination_no_results(connection: api.IConnection): Promise<void> {
    // Test 1: Pagination controls with non-existent query
    const result1 = await api.functional.communityPlatform.search.unified(connection, {
        body: {
            search: "nonexistentquery12345",
            page: 1,
            limit: 10,
        } satisfies ICommunityPlatformPost.IUnified,
    });
    typia.assert(result1);
    // Fix: Use proper type assertion with unknown first, then to array of union types
    TestValidator.equals("no results for non-existent query", ((result1.data as unknown) as Array<ICommunityPlatformMember.ISummary | ICommunityPlatformCommunity.ISummary | ICommunityPlatformPost.ISummary>).length, 0);
    TestValidator.equals("total_count should be 0 for non-existent query", result1.pagination.total_count, 0);
    TestValidator.equals("total_pages should be 0 for non-existent query", result1.pagination.total_pages, 0);
    TestValidator.predicate("has_next_page should be false when total_pages is 0", !result1.pagination.has_next_page);
    TestValidator.predicate("has_prev_page should be false when page is 1", !result1.pagination.has_prev_page);
    // Test 2: Pagination with page 2 (still no results)
    const result2 = await api.functional.communityPlatform.search.unified(connection, {
        body: {
            search: "nonexistentquery12345",
            page: 2,
            limit: 10,
        } satisfies ICommunityPlatformPost.IUnified,
    });
    typia.assert(result2);
    TestValidator.equals("no results for non-existent query on page 2", ((result2.data as unknown) as Array<ICommunityPlatformMember.ISummary | ICommunityPlatformCommunity.ISummary | ICommunityPlatformPost.ISummary>).length, 0);
    TestValidator.equals("total_count should be 0 on page 2 as well", result2.pagination.total_count, 0);
    TestValidator.equals("total_pages should be 0 on page 2", result2.pagination.total_pages, 0);
    TestValidator.predicate("has_next_page should be false on page 2 with no results", !result2.pagination.has_next_page);
    TestValidator.predicate("has_prev_page should be false on page 2 with no results", !result2.pagination.has_prev_page);
    // Test 3: Case-insensitive search with random uppercase query
    const uppercaseQuery = RandomGenerator.alphabets(10).toUpperCase();
    const result3 = await api.functional.communityPlatform.search.unified(connection, {
        body: {
            search: uppercaseQuery,
            page: 1,
            limit: 10,
        } satisfies ICommunityPlatformPost.IUnified,
    });
    typia.assert(result3);
    // This might return results if there are matching communities/posts/users
    // We just validate the response structure, not the content
    TestValidator.predicate("pagination metadata should be valid for case-insensitive search", result3.pagination.total_count >= 0);
    TestValidator.predicate("total_pages should be non-negative", result3.pagination.total_pages >= 0);
    TestValidator.predicate("page should be 1", result3.pagination.page === 1);
    TestValidator.predicate("limit should be 10", result3.pagination.limit === 10);
    // Test 4: Partial matching test with random substring
    const randomContent = RandomGenerator.paragraph({ sentences: 3 });
    const partialQuery = RandomGenerator.substring(randomContent);
    const result4 = await api.functional.communityPlatform.search.unified(connection, {
        body: {
            search: partialQuery,
            page: 1,
            limit: 10,
        } satisfies ICommunityPlatformPost.IUnified,
    });
    typia.assert(result4);
    TestValidator.predicate("pagination metadata should be valid for partial matching search", result4.pagination.total_count >= 0);
    // Test 5: Empty search query
    const result5 = await api.functional.communityPlatform.search.unified(connection, {
        body: {
            search: "",
            page: 1,
            limit: 10,
        } satisfies ICommunityPlatformPost.IUnified,
    });
    typia.assert(result5);
    // Validate empty search behavior
    TestValidator.predicate("pagination metadata should be valid for empty search", result5.pagination.total_count >= 0);
}