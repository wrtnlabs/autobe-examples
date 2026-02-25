import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_browsing_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create test setup data using the connection directly since no admin endpoints are available
  // We'll test with existing data and verify filtering behavior
  // Test individual filters
  // 1. Test search filter with partial name matching
  const searchTest = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        search: "tech",
        limit: 10,
      } satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  typia.assert(searchTest);
  // Validate that search returns relevant results (if any exist)
  if (searchTest.data.length > 0) {
    for (const category of searchTest.data) {
      TestValidator.predicate(
        "category name contains search term",
        category.name.toLowerCase().includes("tech"),
      );
    }
  }
  // 2. Test exact slug matching
  const slugTest = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        slug: "programming",
        limit: 10,
      } satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  typia.assert(slugTest);
  // Validate slug exact match
  if (slugTest.data.length > 0) {
    for (const category of slugTest.data) {
      TestValidator.equals(
        "category slug matches exactly",
        category.slug,
        "programming",
      );
    }
  }
  // 3. Test active status filter
  const activeTest = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        is_active: true,
        limit: 10,
      } satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  typia.assert(activeTest);
  // Validate all returned categories are active
  for (const category of activeTest.data) {
    TestValidator.predicate(
      "category is active when filtered by is_active=true",
      category.is_active,
    );
  }
  // 4. Test featured status filter
  const featuredTest = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        is_featured: true,
        limit: 10,
      } satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  typia.assert(featuredTest);
  // Validate all returned categories are featured
  for (const category of featuredTest.data) {
    TestValidator.predicate(
      "category is featured when filtered by is_featured=true",
      category.is_featured,
    );
  }
  // 5. Test parent_id filter
  const parentTest = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        parent_id: null, // Test root categories (no parent)
        limit: 10,
      } satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  typia.assert(parentTest);
  // 6. Test combined filters - AND logic verification
  const combinedTest = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        search: "tech",
        is_active: true,
        is_featured: false,
        limit: 10,
      } satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  typia.assert(combinedTest);
  // Validate combined filter AND logic
  for (const category of combinedTest.data) {
    TestValidator.predicate(
      "category matches all combined filter criteria",
      category.name.toLowerCase().includes("tech") &&
        category.is_active === true &&
        category.is_featured === false,
    );
  }
  // 7. Test boolean filter combinations
  const inactiveNonFeaturedTest =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        is_active: false,
        is_featured: false,
        limit: 5,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(inactiveNonFeaturedTest);
  // Validate inactive and non-featured filter
  for (const category of inactiveNonFeaturedTest.data) {
    TestValidator.predicate(
      "category is inactive and non-featured",
      category.is_active === false && category.is_featured === false,
    );
  }
  // 8. Test pagination functionality
  const paginationTest =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(paginationTest);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    typeof paginationTest.pagination,
    "object",
  );
  TestValidator.predicate(
    "has pagination properties",
    typeof paginationTest.pagination.current === "number" &&
      typeof paginationTest.pagination.limit === "number" &&
      typeof paginationTest.pagination.records === "number" &&
      typeof paginationTest.pagination.pages === "number",
  );
  TestValidator.predicate("data is array", Array.isArray(paginationTest.data));
  // Validate pagination limits
  TestValidator.predicate(
    "data length respects pagination limit",
    paginationTest.data.length <= 5,
  );
  // Validate individual category structure if data exists
  if (paginationTest.data.length > 0) {
    const sampleCategory = paginationTest.data[0];
    TestValidator.predicate(
      "category has required properties",
      typeof sampleCategory.id === "string" &&
        typeof sampleCategory.name === "string" &&
        typeof sampleCategory.description === "string" &&
        typeof sampleCategory.slug === "string" &&
        typeof sampleCategory.display_order === "number" &&
        typeof sampleCategory.is_active === "boolean" &&
        typeof sampleCategory.is_featured === "boolean" &&
        (sampleCategory.icon_url === null ||
          typeof sampleCategory.icon_url === "string"),
    );
  }
  // Test edge case: empty results with specific filters
  const emptyResultsTest =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        search: "nonexistent12345xyz",
        limit: 10,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(emptyResultsTest);
  TestValidator.predicate(
    "empty search query returns empty or valid response",
    Array.isArray(emptyResultsTest.data),
  );
}
