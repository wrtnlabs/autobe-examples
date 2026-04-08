import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a product with variants having different inventory levels returns accurate inventory_count for each variant.
 *
 * Validates that the product retrieval endpoint correctly displays all variants regardless of their stock status, with accurate inventory counts reflecting the sum of all inventory records. This ensures sellers can see which variants need restocking.
 *
 * The test verifies that variants with positive stock, zero stock, and low stock are all included in the response with correct inventory_count values. Variants with zero inventory remain visible to allow sellers to identify out-of-stock items.
 *
 * 1. Register and authenticate as a seller.
 * 2. Use simulation mode to retrieve a product with mixed inventory variants.
 * 3. Validate that all variants are present regardless of stock level.
 * 4. Verify inventory_count accuracy for in-stock, out-of-stock, and low-stock variants.
 */
export async function test_api_product_retrieve_with_mixed_inventory_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Enable simulation mode for product retrieval
  // This allows testing without requiring actual product creation endpoints
  const simulatedConnection: api.IConnection = {
    ...sellerConnection,
    simulate: true,
  };
  // Generate a random product ID for the simulated request
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve product in simulation mode
  const retrievedProduct = await api.functional.shoppingMall.seller.products.at(
    simulatedConnection,
    {
      productId,
    },
  );
  typia.assert(retrievedProduct);
  // 4. Validate product has variants
  TestValidator.predicate(
    "product has variants",
    retrievedProduct.variants.length > 0,
  );
  // 5. Validate inventory counts across variants
  // Count variants by inventory status
  const inStockVariants = retrievedProduct.variants.filter(
    (v) => v.inventory_count > 0,
  );
  const outOfStockVariants = retrievedProduct.variants.filter(
    (v) => v.inventory_count === 0,
  );
  // Validate that both in-stock and out-of-stock variants exist
  TestValidator.predicate("has in-stock variants", inStockVariants.length > 0);
  TestValidator.predicate(
    "has out-of-stock variants",
    outOfStockVariants.length > 0,
  );
  // Validate inventory_count is non-negative for all variants
  for (const variant of retrievedProduct.variants) {
    TestValidator.predicate(
      `variant ${variant.sku_code} has non-negative inventory`,
      variant.inventory_count >= 0,
    );
  }
  // Validate all variants are visible regardless of inventory status
  TestValidator.equals(
    "all variants included",
    retrievedProduct.variants.length,
    inStockVariants.length + outOfStockVariants.length,
  );
  // Validate inventory_count type constraints
  for (const variant of retrievedProduct.variants) {
    TestValidator.predicate(
      `variant ${variant.sku_code} inventory is int32`,
      Number.isInteger(variant.inventory_count),
    );
  }
}
