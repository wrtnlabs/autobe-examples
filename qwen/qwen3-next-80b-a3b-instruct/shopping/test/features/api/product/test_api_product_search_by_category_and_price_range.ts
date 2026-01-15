import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttributeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeFilter";
export async function test_api_product_search_by_category_and_price_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a connection for unauthenticated access (no auth utility available)
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate a valid category ID using a mock UUID
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Define price range for filtering
  const minPrice = 10.0;
  const maxPrice = 100.0;
  // Step 4: Set up search request with category ID, price range, pagination (10 items per page), and sort by price ascending
  const searchRequest: IShoppingMallProduct.IRequest = {
    page: 0,
    limit: 10,
    sort_by: "price",
    order: "asc",
    category_id: categoryId,
    min_price: minPrice,
    max_price: maxPrice,
  } satisfies IShoppingMallProduct.IRequest;
  // Step 5: Call the product search endpoint with the constructed request
  const response: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(customerConnection, {
      body: searchRequest,
    });
  typia.assert(response);
  // Step 6: Validate response structure
  TestValidator.equals("page number", response.pagination.current, 0);
  TestValidator.equals("limit per page", response.pagination.limit, 10);
  // Step 7: Validate that all returned products match the category_id filter
  response.data.forEach((product) => {
    TestValidator.equals(
      "product category matches search category",
      product.category_id,
      categoryId,
    );
  });
  // Step 8: Validate that all returned products are within the specified price range
  response.data.forEach((product) => {
    TestValidator.predicate(
      "price within range",
      () => product.price >= minPrice && product.price <= maxPrice,
    );
  });
  // Step 9: Validate that products are sorted by price in ascending order
  for (let i = 0; i < response.data.length - 1; i++) {
    TestValidator.predicate(
      "products sorted by price ascending",
      () => response.data[i].price <= response.data[i + 1].price,
    );
  }
}
