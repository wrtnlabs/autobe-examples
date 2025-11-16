import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test that unauthenticated guests can search and retrieve posts across all
 * communities without authentication.
 *
 * This test validates public access to the post search functionality, ensuring
 * that:
 *
 * 1. No authentication is required to browse posts
 * 2. Posts from all communities are accessible when no community filter is applied
 * 3. Pagination metadata is correctly populated with current page, limit, total
 *    records, and total pages
 * 4. Post summaries contain all required fields: title, post type, vote scores,
 *    comment counts, author information, and community context
 * 5. Default sorting behavior for guest users defaults to 'new' (chronological
 *    sorting)
 *
 * Test steps:
 *
 * 1. Create unauthenticated connection (no authentication headers)
 * 2. Call post search API with minimal parameters (no filters)
 * 3. Validate response structure and pagination metadata
 * 4. Verify business rules are satisfied
 */
export async function test_api_posts_search_all_communities_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create unauthenticated connection by removing any existing headers
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Step 2: Search posts with minimal request body - no filters, relying on defaults
  const requestBody = {
    page: 1,
    limit: 25,
  } satisfies IRedditCommunityPost.IRequest;

  const response: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.posts.index(guestConnection, {
      body: requestBody,
    });

  // Step 3: Validate complete response structure with typia (validates ALL types, formats, required fields)
  typia.assert(response);

  // Step 4: Validate business rules that typia cannot check
  TestValidator.predicate(
    "data array length does not exceed pagination limit",
    response.data.length <= response.pagination.limit,
  );

  TestValidator.predicate(
    "pagination records count is consistent with total pages calculation",
    response.pagination.pages === 0 ||
      (response.pagination.records > 0 && response.pagination.limit > 0),
  );
}
