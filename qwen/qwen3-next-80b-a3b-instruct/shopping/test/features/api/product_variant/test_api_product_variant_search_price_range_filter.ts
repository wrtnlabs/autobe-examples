import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantAttributeSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttributeSummary";
import type { IShoppingMallProductVariantIRequestIAttributes } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantIRequestIAttributes";
export async function test_api_product_variant_search_price_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test the price range filtering functionality with valid parameters
  // Since no product variant creation endpoint is provided, we cannot control test data
  // This test verifies the search endpoint accepts price_min and price_max parameters and returns valid structure
  // Create a search request with valid price range parameters
  const response = await api.functional.shoppingMall.product_variants.index(
    connection,
    {
      body: {
        price_min: 0,
        price_max: 1000,
        limit: 100,
        page: 1,
      } satisfies IShoppingMallProductVariant.IRequest,
    },
  );
  typia.assert(response);
  // Validate response structure
  TestValidator.equals(
    "response has correct structure",
    typeof response.pagination,
    "object",
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  // Validate that pagination properties are valid
  TestValidator.predicate(
    "pagination page >= 0",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // Validate that each variant in the response has valid price
  for (const variant of response.data) {
    TestValidator.predicate(
      "variant price is a number",
      typeof variant.price === "number",
    );
    TestValidator.predicate("variant price >= 0", variant.price >= 0);
  }
  // Test empty range: price_min = price_max = 0
  const emptyRangeResponse =
    await api.functional.shoppingMall.product_variants.index(connection, {
      body: {
        price_min: 0,
        price_max: 0,
        limit: 100,
        page: 1,
      } satisfies IShoppingMallProductVariant.IRequest,
    });
  typia.assert(emptyRangeResponse);
  // Validate response structure for empty range
  TestValidator.equals(
    "empty range response has data array",
    Array.isArray(emptyRangeResponse.data),
    true,
  );
  // Test range with only minimum bound
  const minOnlyResponse =
    await api.functional.shoppingMall.product_variants.index(connection, {
      body: {
        price_min: 50,
        limit: 100,
        page: 1,
      } satisfies IShoppingMallProductVariant.IRequest,
    });
  typia.assert(minOnlyResponse);
  // Validate response structure for min only
  TestValidator.equals(
    "min only response has data array",
    Array.isArray(minOnlyResponse.data),
    true,
  );
  // Test range with only maximum bound
  const maxOnlyResponse =
    await api.functional.shoppingMall.product_variants.index(connection, {
      body: {
        price_max: 50,
        limit: 100,
        page: 1,
      } satisfies IShoppingMallProductVariant.IRequest,
    });
  typia.assert(maxOnlyResponse);
  // Validate response structure for max only
  TestValidator.equals(
    "max only response has data array",
    Array.isArray(maxOnlyResponse.data),
    true,
  );
}
