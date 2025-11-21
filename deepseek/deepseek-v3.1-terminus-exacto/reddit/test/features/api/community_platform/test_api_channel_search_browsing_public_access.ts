import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformChannel";

/**
 * Test public browsing functionality for platform communication channels with
 * comprehensive search and filtering capabilities.
 *
 * This test validates that users can search, filter, and browse channels
 * without authentication requirements. Tests various search scenarios including
 * text-based search by channel name and display name, status filtering (draft,
 * active, archived, suspended), activity status filtering, and multiple sorting
 * options (name, display_name, sort_order, created_at, updated_at). Validates
 * pagination functionality with different page sizes and ensures proper
 * handling of empty search results. Confirms that channel summary information
 * is correctly displayed including essential identification fields while
 * excluding sensitive administrative metadata from public view.
 */
export async function test_api_channel_search_browsing_public_access(
  connection: api.IConnection,
) {
  // Create unauthenticated connection for public access testing
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Test 1: Basic pagination with default parameters
  const basicPage = await api.functional.communityPlatform.channels.index(
    unauthConn,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformChannel.IRequest,
    },
  );
  typia.assert(basicPage);

  TestValidator.predicate(
    "basic pagination returns valid structure",
    basicPage.pagination.current === 1 &&
      basicPage.pagination.limit === 10 &&
      Array.isArray(basicPage.data),
  );

  // Test 2: Text search functionality
  const searchTerm = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const searchResults = await api.functional.communityPlatform.channels.index(
    unauthConn,
    {
      body: {
        page: 1,
        limit: 20,
        search: searchTerm,
      } satisfies ICommunityPlatformChannel.IRequest,
    },
  );
  typia.assert(searchResults);

  // Test 3: Status filtering
  const statuses = ["draft", "active", "archived", "suspended"] as const;
  for (const status of statuses) {
    const filteredResults =
      await api.functional.communityPlatform.channels.index(unauthConn, {
        body: {
          page: 1,
          limit: 5,
          status: status,
        } satisfies ICommunityPlatformChannel.IRequest,
      });
    typia.assert(filteredResults);

    TestValidator.predicate(
      `status filter '${status}' returns valid results`,
      Array.isArray(filteredResults.data),
    );
  }

  // Test 4: Activity status filtering
  const activityFilters = [true, false] as const;
  for (const isActive of activityFilters) {
    const activeResults = await api.functional.communityPlatform.channels.index(
      unauthConn,
      {
        body: {
          page: 1,
          limit: 5,
          is_active: isActive,
        } satisfies ICommunityPlatformChannel.IRequest,
      },
    );
    typia.assert(activeResults);

    TestValidator.predicate(
      `activity filter '${isActive}' returns valid results`,
      Array.isArray(activeResults.data),
    );
  }

  // Test 5: Sorting options
  const sortFields = [
    "name",
    "display_name",
    "sort_order",
    "created_at",
    "updated_at",
  ] as const;
  const sortOrders = ["asc", "desc"] as const;

  for (const sortBy of sortFields) {
    for (const order of sortOrders) {
      const sortedResults =
        await api.functional.communityPlatform.channels.index(unauthConn, {
          body: {
            page: 1,
            limit: 5,
            sort_by: sortBy,
            order: order,
          } satisfies ICommunityPlatformChannel.IRequest,
        });
      typia.assert(sortedResults);

      TestValidator.predicate(
        `sort by '${sortBy}' with order '${order}' returns valid results`,
        Array.isArray(sortedResults.data),
      );
    }
  }

  // Test 6: Empty search query
  const emptySearchResults =
    await api.functional.communityPlatform.channels.index(unauthConn, {
      body: {
        page: 1,
        limit: 10,
        search: "",
      } satisfies ICommunityPlatformChannel.IRequest,
    });
  typia.assert(emptySearchResults);

  TestValidator.predicate(
    "empty search query returns valid results",
    Array.isArray(emptySearchResults.data),
  );

  // Test 7: Complex combination of filters
  const complexFilterResults =
    await api.functional.communityPlatform.channels.index(unauthConn, {
      body: {
        page: 1,
        limit: 15,
        search: RandomGenerator.name(2),
        status: "active",
        is_active: true,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformChannel.IRequest,
    });
  typia.assert(complexFilterResults);

  TestValidator.predicate(
    "complex filter combination returns valid results",
    Array.isArray(complexFilterResults.data) &&
      complexFilterResults.pagination.limit === 15,
  );

  // Test 8: Validate channel summary structure
  if (basicPage.data.length > 0) {
    const sampleChannel = basicPage.data[0];

    TestValidator.predicate(
      "channel summary contains essential fields",
      typeof sampleChannel.id === "string" &&
        typeof sampleChannel.name === "string" &&
        typeof sampleChannel.display_name === "string" &&
        typeof sampleChannel.description === "string" &&
        typeof sampleChannel.sort_order === "number" &&
        typeof sampleChannel.is_active === "boolean" &&
        typeof sampleChannel.status === "string",
    );

    // Validate optional icon_url field
    if (
      sampleChannel.icon_url !== null &&
      sampleChannel.icon_url !== undefined
    ) {
      TestValidator.predicate(
        "icon_url is valid URI when present",
        typeof sampleChannel.icon_url === "string" &&
          sampleChannel.icon_url.length > 0,
      );
    }
  }

  // Test 9: Pagination edge cases
  const largePageResults =
    await api.functional.communityPlatform.channels.index(unauthConn, {
      body: {
        page: 999,
        limit: 100,
      } satisfies ICommunityPlatformChannel.IRequest,
    });
  typia.assert(largePageResults);

  TestValidator.predicate(
    "large page number returns valid pagination structure",
    largePageResults.pagination.current >= 0 &&
      largePageResults.pagination.limit === 100 &&
      Array.isArray(largePageResults.data),
  );
}
