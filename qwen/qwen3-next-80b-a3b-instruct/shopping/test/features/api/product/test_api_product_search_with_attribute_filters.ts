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
export async function test_api_product_search_with_attribute_filters(
  connection: api.IConnection,
): Promise<void> {
  // First, search for products using different attribute value filters
  // Test 1: Search with specific attribute combination that should return matching products
  // Convert attribute object to JSON string as IShoppingMallProductAttributeFilter is defined as string
  const filter1: IShoppingMallProductAttributeFilter = JSON.stringify({
    color: ["red"],
    size: ["large"],
    material: ["cotton"],
  });
  const response1 = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 0,
        limit: 10,
        attribute_values: filter1,
      },
    },
  );
  typia.assert(response1);
  // Verify at least one product matches these attributes
  TestValidator.predicate(
    "at least one product found with specified attributes",
    () => response1.data.length > 0,
  );
  // Test 2: Search with partial attribute filter (only color and size)
  const filter2: IShoppingMallProductAttributeFilter = JSON.stringify({
    color: ["red"],
    size: ["large"],
  });
  const response2 = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 0,
        limit: 10,
        attribute_values: filter2,
      },
    },
  );
  typia.assert(response2);
  // Verify at least one product matches these attributes
  TestValidator.predicate(
    "at least one product found with partial attributes",
    () => response2.data.length > 0,
  );
  // Test 3: Search with multi-value attribute filter
  const filter3: IShoppingMallProductAttributeFilter = JSON.stringify({
    color: ["red", "blue"],
  });
  const response3 = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 0,
        limit: 10,
        attribute_values: filter3,
      },
    },
  );
  typia.assert(response3);
  // Verify products found
  TestValidator.predicate(
    "products found with multi-value filter",
    () => response3.data.length > 0,
  );
  // Test 4: Search with unrelated attribute filter (should return 0 results)
  const filter4: IShoppingMallProductAttributeFilter = JSON.stringify({
    color: ["green"],
    size: ["extra_large"],
  });
  const response4 = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 0,
        limit: 10,
        attribute_values: filter4,
      },
    },
  );
  typia.assert(response4);
  // Verify no products found
  TestValidator.equals(
    "no products found with unrelated attributes",
    response4.data.length,
    0,
  );
}
