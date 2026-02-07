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

export async function test_api_product_search_customer_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Basic search with empty request body (as IRequest is empty object)
  const searchResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {} satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate response structure
  TestValidator.predicate("has products", searchResult.data.length >= 0);
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== null,
  );
  TestValidator.predicate(
    "has records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    searchResult.pagination.pages >= 0,
  );
  TestValidator.predicate("has limit", searchResult.pagination.limit > 0);
  TestValidator.predicate(
    "current page is valid",
    searchResult.pagination.current >= 1,
  );
  // Validate pagination consistency
  if (searchResult.pagination.records > 0) {
    TestValidator.predicate(
      "current page valid",
      searchResult.pagination.current <= searchResult.pagination.pages,
    );
  }
}
