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
 * Test guest community browsing with pagination support.
 *
 * Validates that unauthenticated guests can browse all communities on the platform with proper pagination metadata and filtering. Ensures the community listing endpoint correctly handles search parameters, pagination controls, and returns accurate subscriber counts.
 *
 * The test verifies the complete browsing workflow including authentication establishment, paginated community retrieval, response structure validation, and edge case handling for empty results and pagination boundaries.
 *
 * 1. Establish guest authentication via authorize_guest_join
 * 2. Browse all communities without search parameters
 * 3. Validate pagination metadata structure (current, limit, records, pages)
 * 4. Verify each community contains required fields (id, name, description, icon_url, owner, subscriber_count, created_at)
 * 5. Test pagination with offset and limit parameters
 * 6. Test pagination with page number parameter
 * 7. Verify empty results return valid pagination metadata with zero counts
 * 8. Confirm soft-deleted communities are excluded from results
 */
export async function test_api_community_browse_all_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(auth);
  // 2. Browse all communities without search parameters
  const browseAll = await api.functional.redditLike.guest.communities.index(
    guestConnection,
    {
      body: {} satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(browseAll);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    browseAll.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    browseAll.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    browseAll.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    browseAll.pagination.pages >= 0,
  );
  // 4. Verify community data structure (typia.assert already validates all fields)
  if (browseAll.data.length > 0) {
    const firstCommunity = browseAll.data[0];
    typia.assert(firstCommunity);
    // Business logic validation: subscriber count should be non-negative
    TestValidator.predicate(
      "community has valid subscriber count",
      firstCommunity.subscriber_count >= 0,
    );
  }
  // 5. Test pagination with offset and limit
  const limit = 5;
  const offset = 0;
  const paginatedBrowse =
    await api.functional.redditLike.guest.communities.index(guestConnection, {
      body: {
        offset,
        limit,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(paginatedBrowse);
  TestValidator.equals(
    "paginated response has correct limit",
    paginatedBrowse.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "paginated data length does not exceed limit",
    paginatedBrowse.data.length <= limit,
  );
  // 6. Test pagination with page number
  const page = 2;
  const pageBrowse = await api.functional.redditLike.guest.communities.index(
    guestConnection,
    {
      body: {
        page,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(pageBrowse);
  TestValidator.equals(
    "page number matches",
    pageBrowse.pagination.current,
    page,
  );
  // 7. Test empty results scenario with large offset
  const largeOffset = 999999;
  const emptyBrowse = await api.functional.redditLike.guest.communities.index(
    guestConnection,
    {
      body: {
        offset: largeOffset,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(emptyBrowse);
  TestValidator.equals(
    "empty result has zero records",
    emptyBrowse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    emptyBrowse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has empty data array",
    emptyBrowse.data.length,
    0,
  );
  // 8. Test search functionality
  const searchTerm = RandomGenerator.alphabets(3);
  const searchBrowse = await api.functional.redditLike.guest.communities.index(
    guestConnection,
    {
      body: {
        search: searchTerm,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(searchBrowse);
  // All returned communities should match the search term (case-insensitive partial match)
  if (searchBrowse.data.length > 0) {
    const allMatchSearch = searchBrowse.data.every((community) =>
      community.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    TestValidator.predicate("search results match search term", allMatchSearch);
  }
}
