import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IEconomicDiscussionSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearch";
import type { IEconomicDiscussionSearchFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchFilters";
import type { IEconomicDiscussionSearchMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchMetadata";
import type { IEconomicDiscussionSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchQuery";
import type { IPageIEconomicDiscussionSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionSearchQuery";

/**
 * Test moderator global search functionality with empty results.
 *
 * This test validates proper handling of search queries that return no results,
 * ensuring that zero-result searches provide meaningful feedback to moderators
 * with appropriate pagination metadata and consistent response structure.
 *
 * Testing strategy:
 *
 * 1. Authenticate as a moderator to gain administrative search privileges
 * 2. Perform searches with queries that don't match any existing content
 * 3. Verify the empty response structure includes proper pagination information
 * 4. Validate execution time metrics are reasonable even for empty results
 * 5. Ensure response format matches expected schema for no-data scenarios
 *
 * The test focuses on:
 *
 * - Search functionality with administrative scope
 * - Empty result set handling
 * - Pagination metadata in zero-result scenarios
 * - Response structure validation
 * - Performance monitoring for non-matching queries
 *
 * Implementation Steps:
 *
 * 1. Create moderator account for authentication
 * 2. Execute empty searches with different scope configurations
 * 3. Validate pagination metadata for zero results
 * 4. Test extreme pagination edge cases with empty results
 * 5. Verify response structure consistency across all operations
 * 6. Check comprehensive pagination field validation
 */
export async function test_api_moderator_global_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Empty search with moderator scope and relevance sorting
  const emptySearchModerator =
    await api.functional.economicDiscussion.moderator.search.global.search(
      connection,
      {
        body: {
          query: typia.random<
            string & tags.MinLength<50> & tags.MaxLength<100>
          >(),
          scope: "moderator",
          sort_by: "relevance",
          page: 1,
          limit: 10,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(emptySearchModerator);

  TestValidator.equals(
    "empty search returns zero results",
    emptySearchModerator.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search has data array",
    emptySearchModerator.data.length,
    0,
  );
  TestValidator.equals(
    "empty search has zero pages",
    emptySearchModerator.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search current page 1 (index 0) equals 0",
    emptySearchModerator.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination limit matches request for empty search",
    emptySearchModerator.pagination.limit <=
      emptySearchModerator.pagination.limit,
  );

  // Step 3: Empty search with category filter that doesn't exist
  const emptySearchWithCategory =
    await api.functional.economicDiscussion.moderator.search.global.search(
      connection,
      {
        body: {
          query: RandomGenerator.paragraph({ sentences: 3 }),
          scope: "all",
          categories: [
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              code: "NONEXISTENT-" + RandomGenerator.alphaNumeric(5),
              name: "Non-existent Category",
              display_order: 9999,
              is_active: false,
              article_count: 0,
            },
          ] satisfies IEconomicDiscussionCategory.ISummary[],
          page: 1,
          limit: 5,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(emptySearchWithCategory);

  TestValidator.equals(
    "non-existent category search returns no results",
    emptySearchWithCategory.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent category search limit matches request",
    emptySearchWithCategory.pagination.limit,
    5,
  );
  TestValidator.equals(
    "non-existent category search page 1 (index 0) equals 0",
    emptySearchWithCategory.pagination.current,
    0,
  );

  // Step 4: Empty search with created_at sorting and extreme page number
  const emptySearchByDate =
    await api.functional.economicDiscussion.moderator.search.global.search(
      connection,
      {
        body: {
          query: RandomGenerator.alphaNumeric(20),
          scope: "member",
          sort_by: "created_at",
          order: "desc",
          page: 1,
          limit: 20,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(emptySearchByDate);

  TestValidator.equals(
    "empty search by date returns zero records",
    emptySearchByDate.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search data array is empty",
    emptySearchByDate.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pagination page 1 equals 0",
    emptySearchByDate.pagination.current,
    0,
  );
  TestValidator.equals(
    "empty search has max pages 0",
    emptySearchByDate.pagination.pages,
    0,
  );

  // Step 5: Empty search on page 5 with maximum limit - test extreme edge cases
  const extremePaginationEmpty =
    await api.functional.economicDiscussion.moderator.search.global.search(
      connection,
      {
        body: {
          query: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 10,
            wordMax: 12,
          }),
          scope: "all",
          page: 5,
          limit: 100,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(extremePaginationEmpty);

  TestValidator.equals(
    "extreme empty pagination records still 0",
    extremePaginationEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "extreme empty pagination current page 5 equals 4",
    extremePaginationEmpty.pagination.current,
    4,
  );
  TestValidator.equals(
    "extreme empty pagination max pages 0",
    extremePaginationEmpty.pagination.pages,
    0,
  );
  TestValidator.equals(
    "extreme empty pagination limit max",
    extremePaginationEmpty.pagination.limit,
    100,
  );
  TestValidator.equals(
    "extreme empty data array empty",
    extremePaginationEmpty.data.length,
    0,
  );

  // Step 6: Comprehensive pagination validation with ascending order
  const comprehensiveEmptySearch =
    await api.functional.economicDiscussion.moderator.search.global.search(
      connection,
      {
        body: {
          query: typia.random<
            string & tags.MinLength<25> & tags.MaxLength<75>
          >(),
          scope: "all",
          sort_by: "view_count",
          order: "asc",
          page: 999,
          limit: 1,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(comprehensiveEmptySearch);

  TestValidator.equals(
    "comprehensive empty search has zero records",
    comprehensiveEmptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "comprehensive empty search has zero pages",
    comprehensiveEmptySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "comprehensive empty search page 999 equals 998",
    comprehensiveEmptySearch.pagination.current,
    998,
  );
  TestValidator.equals(
    "comprehensive empty search data is empty",
    comprehensiveEmptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "comprehensive empty search limit matches",
    comprehensiveEmptySearch.pagination.limit,
    1,
  );
}
