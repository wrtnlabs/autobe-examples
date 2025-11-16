import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticleCategory";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";

export async function test_api_shopping_mall_article_category_search(
  connection: api.IConnection,
) {
  // Perform multiple test cases covering various filtering and pagination scenarios

  // 1. Basic search with a random keyword
  const searchKeyword = RandomGenerator.substring(
    "electronics mobile fashion kitchen sports toys books",
  );
  const basicSearchRequest = {
    page: 1,
    limit: 10,
    search: searchKeyword,
    parent_id: null,
    sort_by: "name",
    sort_order: "asc",
  } satisfies IShoppingMallArticleCategory.IRequest;
  const basicSearchResponse =
    await api.functional.shoppingMall.shoppingMallArticleCategories.index(
      connection,
      { body: basicSearchRequest },
    );
  typia.assert(basicSearchResponse);
  TestValidator.predicate(
    "basic search output data is non-empty or empty array",
    Array.isArray(basicSearchResponse.data) &&
      basicSearchResponse.data.every((item) => typeof item.id === "string"),
  );
  TestValidator.equals(
    "pagination current page",
    basicSearchResponse.pagination.current,
    basicSearchRequest.page,
  );
  TestValidator.equals(
    "pagination limit",
    basicSearchResponse.pagination.limit,
    basicSearchRequest.limit,
  );

  // 2. Search filtered by parent_id with null - should act as no filter
  const parentIdSearchRequest = {
    page: 1,
    limit: 5,
    search: null,
    parent_id: null,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IShoppingMallArticleCategory.IRequest;
  const parentIdSearchResponse =
    await api.functional.shoppingMall.shoppingMallArticleCategories.index(
      connection,
      { body: parentIdSearchRequest },
    );
  typia.assert(parentIdSearchResponse);
  TestValidator.predicate(
    "search by null parent_id returns valid pagination data",
    parentIdSearchResponse.pagination.current === parentIdSearchRequest.page &&
      parentIdSearchResponse.pagination.limit === parentIdSearchRequest.limit,
  );

  // 3. Paginated requests to validate page and limit boundaries
  const pageLimitSearchRequest = {
    page: 2,
    limit: 3,
    search: null,
    parent_id: null,
    sort_by: "name",
    sort_order: "asc",
  } satisfies IShoppingMallArticleCategory.IRequest;
  const pageLimitSearchResponse =
    await api.functional.shoppingMall.shoppingMallArticleCategories.index(
      connection,
      { body: pageLimitSearchRequest },
    );
  typia.assert(pageLimitSearchResponse);
  TestValidator.predicate(
    "pagination data matches request",
    pageLimitSearchResponse.pagination.current ===
      pageLimitSearchRequest.page &&
      pageLimitSearchResponse.pagination.limit === pageLimitSearchRequest.limit,
  );
  TestValidator.predicate(
    "response data length less or equal limit",
    pageLimitSearchResponse.data.length <= pageLimitSearchRequest.limit,
  );

  // 4. Search with sort disabled (null)
  const noSortSearchRequest = {
    page: 1,
    limit: 5,
    search: null,
    parent_id: null,
    sort_by: null,
    sort_order: null,
  } satisfies IShoppingMallArticleCategory.IRequest;
  const noSortSearchResponse =
    await api.functional.shoppingMall.shoppingMallArticleCategories.index(
      connection,
      { body: noSortSearchRequest },
    );
  typia.assert(noSortSearchResponse);
  TestValidator.predicate(
    "search with no sort returns valid pagination",
    noSortSearchResponse.pagination.current === noSortSearchRequest.page &&
      noSortSearchResponse.pagination.limit === noSortSearchRequest.limit,
  );

  // 5. Search with valid parent_id (if available in previous responses)
  // We attempt to use parent id of first item from earlier response
  if (parentIdSearchResponse.data.length > 0) {
    const someParent = parentIdSearchResponse.data[0];
    if (someParent.id !== null && someParent.id !== undefined) {
      const parentFilteredRequest = {
        page: 1,
        limit: 5,
        search: null,
        parent_id: someParent.id satisfies string &
          tags.Format<"uuid"> as string & tags.Format<"uuid">,
        sort_by: "name",
        sort_order: "asc",
      } satisfies IShoppingMallArticleCategory.IRequest;
      const parentFilteredResponse =
        await api.functional.shoppingMall.shoppingMallArticleCategories.index(
          connection,
          { body: parentFilteredRequest },
        );
      typia.assert(parentFilteredResponse);
      TestValidator.equals(
        "pagination current page for parent filtered",
        parentFilteredResponse.pagination.current,
        parentFilteredRequest.page,
      );
      TestValidator.equals(
        "pagination limit for parent filtered",
        parentFilteredResponse.pagination.limit,
        parentFilteredRequest.limit,
      );
      TestValidator.predicate(
        "all returned items should have the filtered parent id or null parent",
        parentFilteredResponse.data.every((item) => {
          if (item.parent === null || item.parent === undefined) return true;
          return item.parent.id === someParent.id;
        }),
      );
    }
  }
}
