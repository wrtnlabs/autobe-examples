import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_search_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test basic product search with empty request body
  // The IRequest type is defined as empty object {}, indicating search
  // parameters may be handled through other mechanisms or the type is simplified
  const searchResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {} satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate response structure matches IPageIShoppingMallProduct.ISummary
  TestValidator.predicate(
    "response has data array",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "response has pagination",
    searchResult.pagination !== undefined,
  );
  // Validate pagination structure
  const pagination = searchResult.pagination;
  TestValidator.predicate(
    "pagination has current page",
    typeof pagination.current === "number" && pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof pagination.limit === "number" && pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    typeof pagination.records === "number" && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );
  // Test pagination consistency: pages should be Math.ceil(records/limit) or 0 if records=0
  const expectedPages =
    pagination.records > 0
      ? Math.ceil(pagination.records / pagination.limit)
      : 0;
  TestValidator.equals(
    "pagination pages calculation",
    pagination.pages,
    expectedPages,
  );
  // Test with default empty request
  const defaultSearch = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {} satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(defaultSearch);
  TestValidator.notEquals(
    "response differs from empty",
    searchResult,
    defaultSearch,
  );
  // Test that product summary objects have expected structure
  if (searchResult.data.length > 0) {
    const firstProduct = searchResult.data[0];
    typia.assert(firstProduct);
  }
}
