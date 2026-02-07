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

export async function test_api_product_search_edge_cases_and_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Prepare search request with edge cases
  const boundaryRequest: IShoppingMallProduct.IRequest = {
    name: "",
    category_id: null,
    min_price: 10000,
    max_price: 5000,
    in_stock: false,
    page: 100,
    limit: 1,
    sort: "newest",
  };
  // Execute search with boundary conditions
  const result = await api.functional.shoppingMall.products.index(connection, {
    body: boundaryRequest,
  });
  // Validate response structure with typia
  typia.assert(result);
  // Test boundary condition validations
  TestValidator.equals(
    "returns empty data when page > total pages",
    result.data.length,
    0,
  );
  TestValidator.predicate(
    "has valid pagination structure",
    result.pagination !== null,
  );
  TestValidator.equals(
    "page info exists",
    typeof result.pagination.current,
    "number",
  );
}
