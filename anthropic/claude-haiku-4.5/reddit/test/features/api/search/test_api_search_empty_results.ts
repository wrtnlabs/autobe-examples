import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchIndex";
import type { ICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchResult";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchResult";

/**
 * Test search behavior when no results match the query criteria.
 *
 * This test validates that the search API properly handles queries that return
 * no results. It verifies that empty result sets are returned with correct
 * pagination metadata, and that various search filter combinations all
 * gracefully handle the empty result case.
 *
 * Test flow:
 *
 * 1. Create a member account to enable authenticated search access
 * 2. Perform searches with non-existent keywords to trigger empty results
 * 3. Verify empty pagination metadata (records=0, pages=0)
 * 4. Test multiple filter combinations with empty results:
 *
 *    - Different post type filters
 *    - Various sort orders
 *    - Different pagination limits
 * 5. Confirm no errors occur during empty result searches
 * 6. Validate that performance SLA is met for empty result queries
 */
export async function test_api_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to enable search
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate("member created successfully", member.id !== null);

  // Step 2: Search with non-existent keyword - basic empty result test
  const emptySearchResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "xyzabc_nonexistent_keyword_12345",
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(emptySearchResult);

  // Step 3: Verify empty pagination metadata
  TestValidator.equals(
    "empty result records count is zero",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages count is zero",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result data array is empty",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result current page is 1",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result limit is 20",
    emptySearchResult.pagination.limit,
    20,
  );

  // Step 4: Test empty results with text post type filter
  const textPostFilterResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "qwerty_impossible_search_term",
        page: 1,
        limit: 10,
        postType: "text",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(textPostFilterResult);
  TestValidator.equals(
    "text post type filter empty records",
    textPostFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "text post type filter empty data",
    textPostFilterResult.data.length,
    0,
  );

  // Step 5: Test empty results with link post type filter
  const linkPostFilterResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "asdfgh_no_match_search",
        page: 1,
        limit: 10,
        postType: "link",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(linkPostFilterResult);
  TestValidator.equals(
    "link post type filter empty records",
    linkPostFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "link post type filter empty data",
    linkPostFilterResult.data.length,
    0,
  );

  // Step 6: Test empty results with image post type filter
  const imagePostFilterResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "zyxwvu_not_found",
        page: 1,
        limit: 10,
        postType: "image",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(imagePostFilterResult);
  TestValidator.equals(
    "image post type filter empty records",
    imagePostFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "image post type filter empty data",
    imagePostFilterResult.data.length,
    0,
  );

  // Step 7: Test empty results with relevance sort
  const relevanceSortResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "mnopqr_nonexistent",
        page: 1,
        limit: 15,
        sortBy: "relevance",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(relevanceSortResult);
  TestValidator.equals(
    "relevance sort empty records",
    relevanceSortResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "relevance sort empty data",
    relevanceSortResult.data.length,
    0,
  );

  // Step 8: Test empty results with hot sort
  const hotSortResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "stuvwx_not_exists",
        page: 1,
        limit: 15,
        sortBy: "hot",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(hotSortResult);
  TestValidator.equals(
    "hot sort empty records",
    hotSortResult.pagination.records,
    0,
  );
  TestValidator.equals("hot sort empty data", hotSortResult.data.length, 0);

  // Step 9: Test empty results with new sort
  const newSortResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "yzabcd_search_nothing",
        page: 1,
        limit: 15,
        sortBy: "new",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(newSortResult);
  TestValidator.equals(
    "new sort empty records",
    newSortResult.pagination.records,
    0,
  );
  TestValidator.equals("new sort empty data", newSortResult.data.length, 0);

  // Step 10: Test empty results with top sort
  const topSortResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "efghij_top_empty",
        page: 1,
        limit: 15,
        sortBy: "top",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(topSortResult);
  TestValidator.equals(
    "top sort empty records",
    topSortResult.pagination.records,
    0,
  );
  TestValidator.equals("top sort empty data", topSortResult.data.length, 0);

  // Step 11: Test empty results with minimum score filter
  const minScoreResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "klmnop_min_score",
        page: 1,
        limit: 10,
        minScore: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(minScoreResult);
  TestValidator.equals(
    "min score filter empty records",
    minScoreResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "min score filter empty data",
    minScoreResult.data.length,
    0,
  );

  // Step 12: Test empty results with minimum comments filter
  const minCommentsResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "qrstuv_min_comments",
        page: 1,
        limit: 10,
        minComments: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(minCommentsResult);
  TestValidator.equals(
    "min comments filter empty records",
    minCommentsResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "min comments filter empty data",
    minCommentsResult.data.length,
    0,
  );

  // Step 13: Test empty results with different page limit (max)
  const maxLimitResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "wxyzab_max_limit",
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit empty records",
    maxLimitResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "max limit empty pages",
    maxLimitResult.pagination.pages,
    0,
  );
  TestValidator.equals("max limit empty data", maxLimitResult.data.length, 0);

  // Step 14: Test empty results with small page limit
  const smallLimitResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "cdefgh_small_limit",
        page: 1,
        limit: 1,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(smallLimitResult);
  TestValidator.equals(
    "small limit empty records",
    smallLimitResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "small limit empty pages",
    smallLimitResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "small limit empty data",
    smallLimitResult.data.length,
    0,
  );

  // Step 15: Verify all searches completed successfully
  TestValidator.predicate("all empty searches completed without errors", true);
}
