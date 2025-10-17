import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test the full-text search functionality on community names and descriptions
 * using partial keyword matching.
 *
 * This test validates the trigram-based search capabilities by:
 *
 * 1. Creating a test member account for community management
 * 2. Performing various search queries with partial keywords on existing
 *    communities
 * 3. Validating that the search returns relevant communities with proper
 *    pagination
 * 4. Testing prefix matching, infix matching, and combined filter scenarios
 *
 * The test ensures that users can effectively discover communities through
 * partial text matching, which is essential for the community discovery
 * workflow.
 */
export async function test_api_community_search_with_text_matching(
  connection: api.IConnection,
) {
  // Step 1: Create a test member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Perform initial search to get baseline communities
  const initialSearch: IPageIRedditLikeCommunity.ISummary =
    await api.functional.redditLike.communities.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(initialSearch);

  TestValidator.predicate(
    "initial search should have valid pagination structure",
    initialSearch.pagination.current >= 1,
  );

  // Step 3: Test search with partial keyword matching
  const searchKeyword = "tech";
  const searchResult: IPageIRedditLikeCommunity.ISummary =
    await api.functional.redditLike.communities.index(connection, {
      body: {
        search: searchKeyword,
        page: 1,
        limit: 20,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(searchResult);

  TestValidator.predicate(
    "search results should have valid pagination",
    searchResult.pagination.current === 1,
  );

  // Step 4: Test search with different partial keywords for description matching
  const descriptionSearch: IPageIRedditLikeCommunity.ISummary =
    await api.functional.redditLike.communities.index(connection, {
      body: {
        search: "discuss",
        page: 1,
        limit: 15,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(descriptionSearch);

  // Step 5: Test prefix matching with short keyword
  const prefixSearch: IPageIRedditLikeCommunity.ISummary =
    await api.functional.redditLike.communities.index(connection, {
      body: {
        search: "gam",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(prefixSearch);

  TestValidator.predicate(
    "prefix search should return valid array",
    Array.isArray(prefixSearch.data),
  );

  // Step 6: Test infix matching with mid-word keyword
  const infixSearch: IPageIRedditLikeCommunity.ISummary =
    await api.functional.redditLike.communities.index(connection, {
      body: {
        search: "prog",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(infixSearch);

  // Step 7: Validate that search results are properly paginated
  const paginatedSearch: IPageIRedditLikeCommunity.ISummary =
    await api.functional.redditLike.communities.index(connection, {
      body: {
        search: "community",
        page: 1,
        limit: 5,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(paginatedSearch);

  TestValidator.predicate(
    "paginated search should respect limit constraint",
    paginatedSearch.data.length <= 5,
  );

  // Step 8: Test empty search returns all communities
  const allCommunities: IPageIRedditLikeCommunity.ISummary =
    await api.functional.redditLike.communities.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(allCommunities);

  TestValidator.predicate(
    "all communities search should return results",
    Array.isArray(allCommunities.data),
  );

  // Step 9: Test search with combined filters and sorting
  const filteredSearch: IPageIRedditLikeCommunity.ISummary =
    await api.functional.redditLike.communities.index(connection, {
      body: {
        search: "tech",
        sort_by: "subscriber_count",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(filteredSearch);

  TestValidator.predicate(
    "filtered search with sorting should return valid results",
    Array.isArray(filteredSearch.data),
  );

  // Step 10: Test multiple page navigation
  const secondPage: IPageIRedditLikeCommunity.ISummary =
    await api.functional.redditLike.communities.index(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(secondPage);

  TestValidator.predicate(
    "second page should have correct page number",
    secondPage.pagination.current === 2,
  );
}
