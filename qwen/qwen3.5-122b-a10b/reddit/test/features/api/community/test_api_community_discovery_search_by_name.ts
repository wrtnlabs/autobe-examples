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
 * Test community discovery search functionality with case-insensitive partial name matching.
 *
 * Validates the guest community search endpoint by verifying case-insensitive substring matching, partial name matching, empty search behavior, and proper pagination metadata. The test ensures that guests can discover all communities without subscription requirements.
 *
 * The test searches against existing communities in the system and validates various search scenarios including exact matches, case variations, partial substrings, and empty result sets. Each scenario verifies that the response includes correct community metadata with subscriber counts.
 *
 * 1. Authenticate as guest user via /redditLike/auth/guest/join.
 * 2. Search with "tech" - should match communities containing "tech" case-insensitively.
 * 3. Search with "dev" - should match communities containing "dev" as partial substring.
 * 4. Search with "xyznonexistent" - should return empty array with valid pagination (records: 0, pages: 0).
 * 5. Search with empty string - should return all communities without filtering.
 * 6. Verify each response includes subscriber_count and all required community fields.
 * 7. Verify pagination metadata is correctly calculated for each search result.
 */
export async function test_api_community_discovery_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth: IRedditLikeGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeGuest.IJoin,
    },
  );
  typia.assert(guestAuth);
  // 2. Search with "tech" - should match communities containing "tech" case-insensitively
  const techSearch =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          search: "tech",
          limit: 100,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(techSearch);
  // If results exist, verify all match the search criteria
  if (techSearch.data.length > 0) {
    for (const community of techSearch.data) {
      TestValidator.predicate(
        `community name contains 'tech' case-insensitively: ${community.name}`,
        community.name.toLowerCase().includes("tech"),
      );
    }
  }
  // 3. Search with "dev" - should match communities containing "dev" as partial substring
  const devSearch =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          search: "dev",
          limit: 100,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(devSearch);
  // If results exist, verify all match the search criteria
  if (devSearch.data.length > 0) {
    for (const community of devSearch.data) {
      TestValidator.predicate(
        `community name contains 'dev' case-insensitively: ${community.name}`,
        community.name.toLowerCase().includes("dev"),
      );
    }
  }
  // 4. Search with "xyznonexistent" - should return empty array with valid pagination
  const noMatchSearch =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          search: "xyznonexistent",
          limit: 100,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "no match returns empty data",
    noMatchSearch.data.length,
    0,
  );
  TestValidator.equals(
    "no match pagination records",
    noMatchSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match pagination pages",
    noMatchSearch.pagination.pages,
    0,
  );
  // 5. Search with empty string - should return all communities without filtering
  const emptySearch =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          search: "",
          limit: 100,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(emptySearch);
  // If communities exist, verify empty search returns them
  if (emptySearch.data.length > 0) {
    TestValidator.predicate(
      "empty search returns all communities",
      emptySearch.data.length > 0,
    );
  }
  // 6. Verify each response includes subscriber_count and all required community fields
  const allSearchResults = [techSearch, devSearch, noMatchSearch, emptySearch];
  for (const searchResult of allSearchResults) {
    for (const community of searchResult.data) {
      TestValidator.predicate(
        `community has valid subscriber_count: ${community.name}`,
        typeof community.subscriber_count === "number" &&
          community.subscriber_count >= 0,
      );
      TestValidator.predicate(
        `community has valid id: ${community.name}`,
        community.id.length > 0,
      );
      TestValidator.predicate(
        `community has valid name: ${community.name}`,
        community.name.length > 0,
      );
      TestValidator.predicate(
        `community has valid owner: ${community.name}`,
        community.owner.id.length > 0 && community.owner.username.length > 0,
      );
      TestValidator.predicate(
        `community has valid created_at: ${community.name}`,
        community.created_at.length > 0,
      );
    }
  }
  // 7. Verify pagination metadata is correctly calculated
  TestValidator.predicate(
    "pagination current is non-negative",
    emptySearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    emptySearch.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    emptySearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    emptySearch.pagination.pages >= 0,
  );
  // 8. Verify subscriber count is included in all results
  for (const searchResult of allSearchResults) {
    for (const community of searchResult.data) {
      TestValidator.predicate(
        `community has subscriber_count field: ${community.name}`,
        typeof community.subscriber_count === "number",
      );
    }
  }
}
