import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSearch";
import type { IShoppingMallSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSearch";
export async function test_api_search_global_with_keyword(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random search keyword
  const keyword = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  // Construct search request
  const requestBody: IShoppingMallSearch.IRequest = {
    q: keyword,
    page: 1,
    limit: 20,
  };
  // Call global search endpoint
  const result: IPageIShoppingMallSearch.ISummary =
    await api.functional.shoppingMall.search.global.index(connection, {
      body: requestBody,
    });
  // Validate response structure
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "records should be greater than or equal to 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be greater than or equal to 0",
    result.pagination.pages >= 0,
  );
  // Validate result items
  TestValidator.predicate(
    "result data array should not be empty",
    result.data.length > 0,
  );
  // Validate each item in the result array
  for (const item of result.data) {
    // Check source discriminator - must be one of 'product', 'review', 'category'
    TestValidator.predicate(
      "source must be 'product', 'review', or 'category'",
      item.source === "product" ||
        item.source === "review" ||
        item.source === "category",
    );
    // Validate name is a non-empty string
    TestValidator.predicate(
      "name must be a non-empty string",
      item.name.length > 0,
    );
    // Validate description is a non-empty string
    TestValidator.predicate(
      "description must be a non-empty string",
      item.description.length > 0,
    );
    // Confirm search results contain the search keyword in at least one field
    const lowercaseKeyword = keyword.toLowerCase();
    TestValidator.predicate(
      "search result should contain keyword in name or description",
      item.name.toLowerCase().includes(lowercaseKeyword) ||
        item.description.toLowerCase().includes(lowercaseKeyword),
    );
  }
}
