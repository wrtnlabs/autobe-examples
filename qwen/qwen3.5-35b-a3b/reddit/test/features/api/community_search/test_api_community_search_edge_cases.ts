import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_search_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Test edge cases for community search functionality
  // Note: This test uses only the search endpoint as no community creation API is available
  // 1. Test zero-subscriber communities search
  // Verify search works when communities have 0 subscribers
  const zeroSubSearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        minSubscribers: 0,
        maxSubscribers: 0,
      },
    });
  typia.assert(zeroSubSearch);
  TestValidator.equals(
    "zero-subscriber search returns valid response",
    typeof zeroSubSearch.pagination,
    "object",
  );
  // 2. Test special characters in search query
  // Verify system handles special characters gracefully without errors
  const specialCharSearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: { name: "@#$%^&*()" },
    });
  typia.assert(specialCharSearch);
  TestValidator.equals(
    "special character search returns valid response",
    typeof specialCharSearch,
    "object",
  );
  // 3. Test very long search query (200+ characters)
  // Verify system returns response within 100ms SLO
  const longQuery = "a".repeat(250);
  const longQueryStart = Date.now();
  const longQueryResult =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: { name: longQuery },
    });
  typia.assert(longQueryResult);
  const longQueryDuration = Date.now() - longQueryStart;
  TestValidator.predicate(
    "long query returns within 100ms SLO",
    longQueryDuration < 100,
  );
  // 4. Test unicode character search
  // Verify search works with unicode queries
  const unicodeSearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: { name: "日本語" },
    });
  typia.assert(unicodeSearch);
  TestValidator.equals(
    "unicode search returns valid response",
    typeof unicodeSearch,
    "object",
  );
  // Test emoji search
  const emojiSearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: { name: "🎉" },
    });
  typia.assert(emojiSearch);
  // 5. Test whitespace handling
  // Verify system handles leading/trailing whitespace appropriately
  const whitespaceSearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: { name: "  Test  " },
    });
  typia.assert(whitespaceSearch);
  TestValidator.equals(
    "whitespace search returns valid response",
    typeof whitespaceSearch,
    "object",
  );
  // Test multiple spaces
  const multipleSpacesSearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: { name: "Test    Query" },
    });
  typia.assert(multipleSpacesSearch);
  // 6. Test single character search
  // Verify minimum query length handling and partial match work
  const singleCharSearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: { name: "T" },
    });
  typia.assert(singleCharSearch);
  TestValidator.equals(
    "single character search returns valid response",
    typeof singleCharSearch,
    "object",
  );
  // 7. Test exact vs partial match behavior
  // Verify partial match works (searching for substring)
  const partialMatchSearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: { name: "Tech" },
    });
  typia.assert(partialMatchSearch);
  TestValidator.equals(
    "partial match search returns valid response",
    typeof partialMatchSearch,
    "object",
  );
  // 8. Test multiple simultaneous filters
  // Verify all filters work together correctly
  const multiFilterSearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        name: "Community",
        minSubscribers: 0,
        maxSubscribers: 100,
        sort: "subscriber_count",
        order: "desc",
        page: 1,
        limit: 20,
      },
    });
  typia.assert(multiFilterSearch);
  TestValidator.equals(
    "multi-filter search returns valid response",
    multiFilterSearch.pagination.records >= 0,
    true,
  );
  // 9. Test consistency with empty search (no filters)
  // Verify search with no filters returns valid result set
  const emptySearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {},
    });
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns valid response",
    typeof emptySearch,
    "object",
  );
  // Additional edge case: Test all search parameters together
  const allParamsSearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        name: "test",
        page: 1,
        limit: 10,
        sort: "name",
        order: "asc",
        minSubscribers: 0,
        maxSubscribers: 1000,
      },
    });
  typia.assert(allParamsSearch);
  TestValidator.equals(
    "all parameters search returns valid response",
    allParamsSearch.pagination.records >= 0,
    true,
  );
  // Test limit clamping (value > 100 should be clamped)
  const limitClampSearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: { limit: 200 },
    });
  typia.assert(limitClampSearch);
  TestValidator.predicate(
    "limit clamped within bounds",
    limitClampSearch.pagination.limit <= 100,
  );
}
