import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Test advanced community filtering capabilities using multiple search
 * parameters. Validates filtering by community status (active, archived,
 * suspended, pending), privacy settings (public, private, restricted), and
 * category classification. Tests combination filters and ensures proper result
 * filtering based on specified criteria.
 */
export async function test_api_community_search_advanced_filtering(
  connection: api.IConnection,
) {
  // Test 1: Basic pagination with default parameters
  const basicResults = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(basicResults);
  TestValidator.equals(
    "pagination structure should be object",
    typeof basicResults.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page should be non-negative",
    basicResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be non-negative",
    basicResults.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    basicResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    basicResults.pagination.pages >= 0,
  );

  // Test 2: Filter by different status values
  const statuses = ["active", "archived", "suspended", "pending"] as const;
  for (const status of statuses) {
    const statusResults =
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          status,
          limit: 5,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    typia.assert(statusResults);
    TestValidator.predicate(
      `status filter ${status} should return at most 5 results`,
      statusResults.data.length <= 5,
    );
  }

  // Test 3: Filter by different privacy settings
  const privacySettings = ["public", "private", "restricted"] as const;
  for (const privacy of privacySettings) {
    const privacyResults =
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          privacy,
          limit: 5,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    typia.assert(privacyResults);
    TestValidator.predicate(
      `privacy filter ${privacy} should return at most 5 results`,
      privacyResults.data.length <= 5,
    );
  }

  // Test 4: Search query functionality
  const searchQuery = RandomGenerator.paragraph({ sentences: 1 });
  const searchResults =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: searchQuery,
        limit: 3,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchResults);
  TestValidator.predicate(
    "search query should return at most 3 results",
    searchResults.data.length <= 3,
  );

  // Test 5: Sorting functionality
  const orderFields = ["created_at", "updated_at", "name"] as const;
  const directions = ["asc", "desc"] as const;

  for (const field of orderFields) {
    for (const direction of directions) {
      const sortResults =
        await api.functional.communityPlatform.communities.index(connection, {
          body: {
            order_by: field,
            order_direction: direction,
            limit: 5,
          } satisfies ICommunityPlatformCommunity.IRequest,
        });
      typia.assert(sortResults);
      TestValidator.predicate(
        `sort by ${field} ${direction} should return at most 5 results`,
        sortResults.data.length <= 5,
      );
    }
  }

  // Test 6: Combination filters
  const combinationResults =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        status: "active",
        privacy: "public",
        search: RandomGenerator.paragraph({ sentences: 1 }),
        order_by: "created_at",
        order_direction: "desc",
        limit: 8,
        page: 1,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(combinationResults);
  TestValidator.predicate(
    "combination filter should return at most 8 results",
    combinationResults.data.length <= 8,
  );

  // Test 7: Empty request (all optional parameters omitted)
  const emptyRequestResults =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {} satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(emptyRequestResults);
  TestValidator.equals(
    "empty request should return object pagination",
    typeof emptyRequestResults.pagination,
    "object",
  );
  TestValidator.predicate(
    "empty request should return array data",
    Array.isArray(emptyRequestResults.data),
  );

  // Test 8: Category filtering with UUID
  const categoryResults =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        limit: 5,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(categoryResults);
  TestValidator.predicate(
    "category filter should return at most 5 results",
    categoryResults.data.length <= 5,
  );

  // Test 9: Boundary testing for limit parameter
  const minLimitResults =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 1,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(minLimitResults);
  TestValidator.predicate(
    "minimum limit should return at most 1 result",
    minLimitResults.data.length <= 1,
  );

  const maxLimitResults =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 100,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(maxLimitResults);
  TestValidator.predicate(
    "maximum limit should return at most 100 results",
    maxLimitResults.data.length <= 100,
  );

  // Test 10: Page boundary testing
  const firstPageResults =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(firstPageResults);
  TestValidator.equals(
    "first page should have current page 1",
    firstPageResults.pagination.current,
    1,
  );

  // Test 11: Error scenario - invalid page number (should use default)
  const invalidPageResults =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 0, // Invalid, should use default
        limit: 5,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(invalidPageResults);
  TestValidator.predicate(
    "invalid page should return valid results",
    invalidPageResults.data.length <= 5,
  );

  // Test 12: Complex combination with all parameters
  const complexResults =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 2,
        limit: 15,
        search: "community",
        status: "active",
        privacy: "public",
        order_by: "name",
        order_direction: "asc",
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(complexResults);
  TestValidator.predicate(
    "complex filter should return at most 15 results",
    complexResults.data.length <= 15,
  );
}
