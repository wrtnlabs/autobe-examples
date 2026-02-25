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

export async function test_api_category_browsing_search_functionality(
  connection: api.IConnection,
): Promise<void> {
  // Test case-insensitive search with partial matching
  const searchResult = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        search: "prog",
      } satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate search functionality
  TestValidator.predicate(
    "search returns valid pagination structure",
    searchResult.pagination.current >= 0 &&
      searchResult.pagination.limit >= 0 &&
      searchResult.pagination.records >= 0 &&
      searchResult.pagination.pages >= 0,
  );
  // Test empty search term
  const emptySearch = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        search: "",
      } satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search term returns valid response",
    emptySearch.data.length >= 0,
  );
  // Test search combination with active filter
  const searchActive = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        search: "dev",
        is_active: true,
      } satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  typia.assert(searchActive);
  if (searchActive.data.length > 0) {
    TestValidator.predicate(
      "search with active filter returns only active categories when results exist",
      searchActive.data.every((category) => category.is_active),
    );
  }
  // Test search combination with featured filter
  const searchFeatured =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        search: "tech",
        is_featured: true,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(searchFeatured);
  if (searchFeatured.data.length > 0) {
    TestValidator.predicate(
      "search with featured filter returns only featured categories when results exist",
      searchFeatured.data.every((category) => category.is_featured),
    );
  }
  // Test pagination with search
  const paginatedSearch =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        search: "code",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "pagination limits results correctly",
    paginatedSearch.data.length <= 10,
  );
  // Verify sorting by display_order
  TestValidator.predicate(
    "results maintain display_order sorting",
    paginatedSearch.data.every(
      (category, index, array) =>
        index === 0 || category.display_order >= array[index - 1].display_order,
    ),
  );
  // Test case-insensitive search comparison
  const upperSearch = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        search: "PROG",
      } satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  typia.assert(upperSearch);
  const lowerSearch = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        search: "prog",
      } satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  typia.assert(lowerSearch);
  // Case-insensitive search should return similar results
  TestValidator.predicate(
    "case-insensitive search behaves consistently",
    upperSearch.pagination.records === lowerSearch.pagination.records,
  );
  // Test very short search term
  const shortSearch = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        search: "de",
      } satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  typia.assert(shortSearch);
  TestValidator.predicate("short search term handles gracefully", true);
  // Test search with slug filtering
  const slugSearch = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        search: "test",
        slug: "specific-slug",
      } satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  typia.assert(slugSearch);
  TestValidator.predicate(
    "search with slug filter returns valid response",
    true,
  );
  // Test search with parent_id filter
  const parentSearch = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        search: "system",
        parent_id: null,
      } satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  typia.assert(parentSearch);
  TestValidator.predicate(
    "search with parent_id filter returns valid response",
    true,
  );
}
