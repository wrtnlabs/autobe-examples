import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";

/**
 * Test that unauthenticated users can search and discover communities.
 *
 * This test validates that community discovery is accessible to all users
 * without requiring authentication, supporting platform growth through easy
 * community browsing. It verifies that the public community listing endpoint
 * returns properly paginated results with complete community summary
 * information.
 *
 * Steps:
 *
 * 1. Create unauthenticated connection (no auth headers)
 * 2. Call community search endpoint with pagination parameters
 * 3. Validate response structure follows IPage<ISummary> pattern
 * 4. Verify pagination metadata matches request parameters
 * 5. Test with different pagination parameters to ensure proper handling
 */
export async function test_api_community_search_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create unauthenticated connection with empty headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 2: Call community search endpoint with basic pagination
  const searchRequest = {
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityCommunity.IRequest;

  const searchResult: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(unauthConnection, {
      body: searchRequest,
    });

  // Step 3: Validate the complete response structure
  typia.assert(searchResult);

  // Step 4: Verify pagination metadata matches request parameters
  TestValidator.equals(
    "current page matches request",
    searchResult.pagination.current,
    0,
  );

  TestValidator.equals(
    "limit matches request",
    searchResult.pagination.limit,
    10,
  );

  // Step 5: Test with different pagination parameters
  const secondPageRequest = {
    page: 2,
    limit: 5,
  } satisfies IRedditCommunityCommunity.IRequest;

  const secondPageResult: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(unauthConnection, {
      body: secondPageRequest,
    });

  typia.assert(secondPageResult);

  TestValidator.equals(
    "second page current value",
    secondPageResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "second page limit value",
    secondPageResult.pagination.limit,
    5,
  );
}
