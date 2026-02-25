import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_search_category_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test the product search functionality with category filter
  const testSearch = await api.functional.shoppingMall.search.products.index(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(testSearch);
  // Validate search results structure
  TestValidator.predicate("has data array", Array.isArray(testSearch.data));
  TestValidator.predicate("has pagination", testSearch.pagination !== null);
  // Validate pagination fields
  TestValidator.equals(
    "pagination has current",
    typeof testSearch.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof testSearch.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    typeof testSearch.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages",
    typeof testSearch.pagination.pages,
    "number",
  );
  // Validate product summary structure in results
  if (testSearch.data.length > 0) {
    const product = testSearch.data[0];
    TestValidator.equals("product has id", typeof product.id, "string");
    TestValidator.equals("product has name", typeof product.name, "string");
    TestValidator.equals(
      "product has base_price",
      typeof product.base_price,
      "number",
    );
    TestValidator.equals(
      "product has seller info",
      product.seller !== undefined && product.seller !== null,
      true,
    );
    TestValidator.equals(
      "product has category info",
      product.category !== undefined && product.category !== null,
      true,
    );
    // Validate nested structures when they exist
    if (product.seller) {
      TestValidator.equals("seller has id", typeof product.seller.id, "string");
      TestValidator.equals(
        "seller has shop_name",
        typeof product.seller.shop_name,
        "string",
      );
    }
    if (product.category) {
      TestValidator.equals(
        "category has id",
        typeof product.category.id,
        "string",
      );
      TestValidator.equals(
        "category has name",
        typeof product.category.name,
        "string",
      );
    }
  }
}
