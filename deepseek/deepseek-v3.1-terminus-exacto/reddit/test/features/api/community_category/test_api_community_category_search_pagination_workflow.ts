import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";

/**
 * Test category search pagination workflow across multiple pages. Validates
 * that pagination parameters (page, limit) work correctly and that total record
 * counts and page calculations are accurate. Tests navigation between pages and
 * consistency of search results across pagination boundaries.
 *
 * This test focuses on the search functionality with pagination parameters,
 * assuming categories already exist in the system.
 */
export async function test_api_community_category_search_pagination_workflow(
  connection: api.IConnection,
) {
  // Use a realistic community slug that likely exists
  const communitySlug = "general";

  // Test default pagination (page 1 with default limit)
  const defaultPage =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(defaultPage);

  // Validate pagination metadata structure
  TestValidator.equals(
    "default page should be page 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be a positive number",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be a non-negative number",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be a non-negative number",
    defaultPage.pagination.pages >= 0,
  );

  // Test page 2 with custom limit
  const secondPage =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page should be page 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit should be 5",
    secondPage.pagination.limit,
    5,
  );

  // Test pagination consistency
  TestValidator.equals(
    "total records should be consistent across pages",
    defaultPage.pagination.records,
    secondPage.pagination.records,
  );

  // Test with search functionality
  const searchPage =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          page: 1,
          limit: 10,
          search: "general",
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(searchPage);

  // Test with status filter
  const activePage =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          page: 1,
          limit: 10,
          status: "active",
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(activePage);

  // Test with active status filter
  const isActivePage =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          page: 1,
          limit: 10,
          is_active: true,
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(isActivePage);

  // Test sorting functionality
  const sortedPage =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          page: 1,
          limit: 10,
          order_by: "name",
          order_direction: "asc",
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(sortedPage);

  // Test boundary condition - first page
  const firstPage =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          page: 1,
          limit: 100, // Large limit to test first page behavior
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(firstPage);

  TestValidator.equals(
    "first page should be page 1",
    firstPage.pagination.current,
    1,
  );

  // Test with different limit values
  const smallLimitPage =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          page: 1,
          limit: 1, // Minimum limit
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(smallLimitPage);

  TestValidator.equals(
    "small limit page should have limit 1",
    smallLimitPage.pagination.limit,
    1,
  );

  // Validate pagination calculations
  if (defaultPage.pagination.records > 0 && defaultPage.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      defaultPage.pagination.records / defaultPage.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation should be correct",
      defaultPage.pagination.pages,
      expectedPages,
    );
  }
}
