import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product variant stock filtering functionality.
 *
 * Validates that the variants listing endpoint correctly filters variants by stock availability using the in_stock query parameter. This test ensures real-time stock calculation from inventory history records is properly applied when filtering variant listings.
 *
 * The endpoint supports two stock filter modes:
 * - in_stock=true: Returns only variants with available inventory (stock_count > 0)
 * - in_stock=false: Returns only variants with no available inventory (stock_count = 0)
 *
 * 1. Call variants index with in_stock=true filter and verify all returned variants have stock_count > 0
 * 2. Call variants index with in_stock=false filter and verify all returned variants have stock_count = 0
 * 3. Validate response structure using typia.assert for complete type safety
 */
export async function test_api_product_variants_filter_by_stock(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product ID for testing (assumes pre-existing test data)
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test 1: Filter with in_stock=true (should return only variants with stock > 0)
  const inStockResponse: IPageIEcommerceProductVariant.ISummary =
    await api.functional.ecommerce.products.variants.index(connection, {
      productId,
      body: {
        in_stock: true,
      } satisfies IEcommerceProductVariant.IRequest,
    });
  typia.assert(inStockResponse);
  // Validate all returned variants have stock_count > 0
  for (const variant of inStockResponse.data) {
    TestValidator.predicate(
      "in_stock=true filter returns only variants with stock > 0",
      variant.stock_count > 0,
    );
  }
  // Test 2: Filter with in_stock=false (should return only variants with stock = 0)
  const outOfStockResponse: IPageIEcommerceProductVariant.ISummary =
    await api.functional.ecommerce.products.variants.index(connection, {
      productId,
      body: {
        in_stock: false,
      } satisfies IEcommerceProductVariant.IRequest,
    });
  typia.assert(outOfStockResponse);
  // Validate all returned variants have stock_count = 0
  for (const variant of outOfStockResponse.data) {
    TestValidator.predicate(
      "in_stock=false filter returns only variants with stock = 0",
      variant.stock_count === 0,
    );
  }
}
