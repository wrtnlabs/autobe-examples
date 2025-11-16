import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

export async function test_api_community_search_category_filtering(
  connection: api.IConnection,
) {
  // Test 1: Search communities with valid category filter
  const validCategoryId = typia.random<string & tags.Format<"uuid">>();
  const categorySearchResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        category_id: validCategoryId,
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(categorySearchResult);

  TestValidator.predicate(
    "category search returns paginated results",
    categorySearchResult.pagination.records >= 0,
  );

  // Test 2: Search with non-existent category_id
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        category_id: nonExistentCategoryId,
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(emptyResult);

  TestValidator.predicate(
    "non-existent category returns empty result set",
    emptyResult.data.length === 0,
  );

  // Test 3: Combine category filter with text search
  const searchKeyword = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 5,
  }).substring(0, 50);
  const combinedSearchResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        category_id: validCategoryId,
        search: searchKeyword satisfies string as string &
          tags.MinLength<1> &
          tags.MaxLength<100>,
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(combinedSearchResult);

  TestValidator.predicate(
    "combined category and text search returns valid page",
    combinedSearchResult.pagination.limit === 20,
  );

  // Test 4: Combine category filter with sort options
  const sortedResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        category_id: validCategoryId,
        sort: "subscriber_count",
        direction: "desc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(sortedResult);

  TestValidator.predicate(
    "category filter with sorting returns valid results",
    sortedResult.pagination.current >= 0,
  );

  // Test 5: Verify pagination with category filter
  const paginationTest: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        category_id: validCategoryId,
        limit: 10,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(paginationTest);

  TestValidator.predicate(
    "pagination respects limit parameter with category filter",
    paginationTest.data.length <= paginationTest.pagination.limit,
  );

  // Test 6: Verify public visibility filtering with category
  const visibilityFilterResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        category_id: validCategoryId,
        visibility: "public",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(visibilityFilterResult);

  TestValidator.predicate(
    "public visibility filter with category returns valid page",
    visibilityFilterResult.pagination.records >= 0,
  );

  // Test 7: Verify results with multiple filters combined
  const multiFilterResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        category_id: validCategoryId,
        visibility: "public",
        sort: "created_at",
        direction: "asc",
        limit: 15,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(multiFilterResult);

  TestValidator.predicate(
    "multiple combined filters return paginated results",
    multiFilterResult.pagination.limit === 15,
  );

  // Test 8: Validate result data structure
  if (categorySearchResult.data.length > 0) {
    const community = categorySearchResult.data[0];
    TestValidator.predicate(
      "returned community has valid identifier format",
      /^[a-z0-9_]+$/.test(community.identifier),
    );

    TestValidator.predicate(
      "returned community has non-negative metrics",
      community.subscriber_count >= 0 && community.post_count >= 0,
    );
  }
}
