import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test community search empty results handling.
 *
 * Validates that the community search endpoint gracefully handles search queries that return no matching results. This ensures the API returns proper pagination metadata with empty data arrays rather than error responses when no communities match the search term.
 *
 * The test uses a unique search term that is guaranteed not to match any existing communities in the database, verifying the system's ability to handle edge cases in search functionality.
 *
 * 1. Call the search endpoint with a unique search term that matches no communities.
 * 2. Verify the response contains an empty data array.
 * 3. Validate pagination metadata shows 0 records and 0 pages.
 * 4. Confirm current page is 1 and limit matches the request.
 */
export async function test_api_community_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique search term that won't match any existing communities
  const uniqueSearchTerm = `xyz123nonexistent${RandomGenerator.alphabets(8)}`;
  // Call the search endpoint with the unique term
  const result = await api.functional.redditLike.guest.communities.search(
    connection,
    {
      body: {
        search: uniqueSearchTerm,
        limit: 10,
        page: 1,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(result);
  // Validate empty data array
  TestValidator.equals("data array is empty", result.data.length, 0);
  // Validate pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit matches request", result.pagination.limit, 10);
  TestValidator.equals("records count is 0", result.pagination.records, 0);
  TestValidator.equals("pages count is 0", result.pagination.pages, 0);
}
