import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Test community sorting by subscriber count (descending and ascending).
 *
 * Validates that the community search API correctly sorts communities by
 * subscriber_count in both descending (largest first) and ascending (smallest
 * first) order. Tests that sorting maintains accuracy when combined with
 * pagination and filtering, and verifies that subscriber_count values correctly
 * reflect current subscription metrics.
 *
 * Test workflow:
 *
 * 1. Search communities with sort='subscriber_count' and direction='desc'
 * 2. Validate results are ordered by subscriber_count in descending order
 * 3. Search communities with sort='subscriber_count' and direction='asc'
 * 4. Validate results are ordered by subscriber_count in ascending order
 * 5. Test sorting with pagination to ensure consistency across pages
 * 6. Verify subscriber_count values are non-negative and realistic
 */
export async function test_api_community_search_sorting_by_subscriber_count(
  connection: api.IConnection,
) {
  // Test 1: Search with descending subscriber_count sort
  const descendingRequest = {
    sort: "subscriber_count",
    direction: "desc",
    limit: 20,
    offset: 0,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const descendingResults: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: descendingRequest,
    });
  typia.assert(descendingResults);

  // Validate descending order: each community should have subscriber_count >= next community
  if (descendingResults.data.length > 1) {
    for (let i = 0; i < descendingResults.data.length - 1; i++) {
      const current = descendingResults.data[i];
      const next = descendingResults.data[i + 1];
      TestValidator.predicate(
        "descending sort: current subscriber_count >= next subscriber_count",
        current.subscriber_count >= next.subscriber_count,
      );
    }
  }

  // Validate subscriber_count is non-negative
  for (const community of descendingResults.data) {
    TestValidator.predicate(
      "subscriber_count is non-negative",
      community.subscriber_count >= 0,
    );
  }

  // Test 2: Search with ascending subscriber_count sort
  const ascendingRequest = {
    sort: "subscriber_count",
    direction: "asc",
    limit: 20,
    offset: 0,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const ascendingResults: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: ascendingRequest,
    });
  typia.assert(ascendingResults);

  // Validate ascending order: each community should have subscriber_count <= next community
  if (ascendingResults.data.length > 1) {
    for (let i = 0; i < ascendingResults.data.length - 1; i++) {
      const current = ascendingResults.data[i];
      const next = ascendingResults.data[i + 1];
      TestValidator.predicate(
        "ascending sort: current subscriber_count <= next subscriber_count",
        current.subscriber_count <= next.subscriber_count,
      );
    }
  }

  // Test 3: Test sorting with pagination - first page descending
  const paginatedRequest1 = {
    sort: "subscriber_count",
    direction: "desc",
    limit: 10,
    offset: 0,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const paginatedPage1: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: paginatedRequest1,
    });
  typia.assert(paginatedPage1);

  // Verify pagination info is valid
  TestValidator.predicate(
    "pagination current page is valid",
    paginatedPage1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    paginatedPage1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    paginatedPage1.pagination.records >= 0,
  );

  // Test 4: Test sorting with pagination - second page descending
  if (paginatedPage1.pagination.pages > 1) {
    const paginatedRequest2 = {
      sort: "subscriber_count",
      direction: "desc",
      limit: 10,
      offset: 10,
    } satisfies ICommunityPlatformCommunity.IRequest;

    const paginatedPage2: IPageICommunityPlatformCommunity.ISummary =
      await api.functional.communityPlatform.communities.index(connection, {
        body: paginatedRequest2,
      });
    typia.assert(paginatedPage2);

    // Validate both pages maintain descending order
    if (paginatedPage1.data.length > 0 && paginatedPage2.data.length > 0) {
      const lastInPage1 = paginatedPage1.data[paginatedPage1.data.length - 1];
      const firstInPage2 = paginatedPage2.data[0];

      TestValidator.predicate(
        "page 1 last >= page 2 first in descending order",
        lastInPage1.subscriber_count >= firstInPage2.subscriber_count,
      );
    }
  }

  // Test 5: Verify each community has realistic data
  const allCommunities = [...descendingResults.data, ...ascendingResults.data];
  const uniqueCommunities = Array.from(
    new Map(allCommunities.map((c) => [c.id, c])).values(),
  );

  for (const community of uniqueCommunities.slice(0, 5)) {
    // Validate required fields exist
    TestValidator.predicate(
      "community has valid id (uuid format)",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        community.id,
      ),
    );

    TestValidator.predicate(
      "community has valid identifier format",
      /^[a-z0-9_]{3,32}$/.test(community.identifier),
    );

    TestValidator.predicate(
      "community name is non-empty",
      community.name.length > 0,
    );

    TestValidator.predicate(
      "community post_count is non-negative",
      community.post_count >= 0,
    );

    TestValidator.predicate(
      "community created_at is valid date",
      !isNaN(new Date(community.created_at).getTime()),
    );
  }

  // Test 6: Test sorting combined with search filter
  const searchRequest = {
    search: "community",
    sort: "subscriber_count",
    direction: "desc",
    limit: 15,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const searchResults: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResults);

  // Validate search results maintain descending sort
  if (searchResults.data.length > 1) {
    for (let i = 0; i < searchResults.data.length - 1; i++) {
      const current = searchResults.data[i];
      const next = searchResults.data[i + 1];
      TestValidator.predicate(
        "search + sort: current >= next in descending order",
        current.subscriber_count >= next.subscriber_count,
      );
    }
  }
}
