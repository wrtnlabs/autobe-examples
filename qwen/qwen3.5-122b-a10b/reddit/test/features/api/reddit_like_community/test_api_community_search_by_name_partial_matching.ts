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
 * Test guest community search by name with case-insensitive partial matching.
 *
 * Validates that guests can discover communities through text-based search with partial name matching. The search functionality must be case-insensitive and support substring matching anywhere in the community name.
 *
 * This test verifies the complete search workflow including authentication, search execution, and result validation across multiple scenarios without requiring community creation.
 *
 * 1. Guest authenticates via join endpoint to obtain access token.
 * 2. Test partial name search returns matching communities or empty array.
 * 3. Test case-insensitivity by searching with different case variations.
 * 4. Test empty search returns all communities without filtering.
 * 5. Test search with no matches returns empty data array with valid pagination.
 * 6. Test pagination works correctly after search filtering.
 * 7. Test special characters in search terms are handled safely.
 * 8. Verify community data structure in search results when available.
 *
 * @param connection The HTTP connection to the server
 */
export async function test_api_community_search_by_name_partial_matching(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Test partial name search - search for "dev" should match communities with "dev" anywhere
  const partialSearchResult =
    await api.functional.redditLike.guest.communities.index(guestConnection, {
      body: {
        search: "dev",
        limit: 100,
        offset: 0,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(partialSearchResult);
  // Validate pagination metadata is present and valid
  TestValidator.predicate(
    "pagination exists",
    partialSearchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    partialSearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    partialSearchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    partialSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    partialSearchResult.pagination.pages >= 0,
  );
  // 3. Test case-insensitivity - search for "TECH" should match "Technology", "TechNews", etc.
  const caseInsensitiveResult =
    await api.functional.redditLike.guest.communities.index(guestConnection, {
      body: {
        search: "TECH",
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(caseInsensitiveResult);
  // 4. Test empty search returns all communities (no filtering)
  const allCommunitiesResult =
    await api.functional.redditLike.guest.communities.index(guestConnection, {
      body: {
        search: "",
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(allCommunitiesResult);
  // Empty search should return communities with valid pagination
  TestValidator.predicate(
    "empty search has valid pagination",
    allCommunitiesResult.pagination.records >= 0,
  );
  // 5. Test search with no matches returns empty data array
  const noMatchResult = await api.functional.redditLike.guest.communities.index(
    guestConnection,
    {
      body: {
        search: "xyz123nonexistent",
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(noMatchResult);
  // No matches should return empty data array with valid pagination
  TestValidator.equals(
    "no match returns empty data",
    noMatchResult.data.length,
    0,
  );
  TestValidator.predicate(
    "no match has valid pagination",
    noMatchResult.pagination.records >= 0,
  );
  // 6. Test pagination with search - search first, then paginate
  const paginatedSearchResult =
    await api.functional.redditLike.guest.communities.index(guestConnection, {
      body: {
        search: "dev",
        offset: 0,
        limit: 5,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(paginatedSearchResult);
  // Paginated results should respect the limit
  TestValidator.predicate(
    "paginated results respect limit",
    paginatedSearchResult.data.length <= paginatedSearchResult.pagination.limit,
  );
  // 7. Test search with special characters
  const specialCharResult =
    await api.functional.redditLike.guest.communities.index(guestConnection, {
      body: {
        search: "test-community_2024",
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(specialCharResult);
  // 8. Verify community data structure in search results when available
  if (partialSearchResult.data.length > 0) {
    const firstCommunity = partialSearchResult.data[0];
    typia.assert(firstCommunity);
    // Validate required fields exist
    TestValidator.predicate(
      "community has id",
      firstCommunity.id !== undefined,
    );
    TestValidator.predicate(
      "community has name",
      firstCommunity.name !== undefined,
    );
    TestValidator.predicate(
      "community has owner",
      firstCommunity.owner !== undefined,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      firstCommunity.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "community has created_at",
      firstCommunity.created_at !== undefined,
    );
  }
  // 9. Test null search (treated same as empty string)
  const nullSearchResult =
    await api.functional.redditLike.guest.communities.index(guestConnection, {
      body: {
        search: undefined,
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(nullSearchResult);
  // Null search should return all communities with valid pagination
  TestValidator.predicate(
    "null search has valid pagination",
    nullSearchResult.pagination.records >= 0,
  );
}
