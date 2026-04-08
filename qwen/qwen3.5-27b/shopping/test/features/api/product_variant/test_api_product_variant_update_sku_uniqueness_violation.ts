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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test the SKU code uniqueness business rule when updating a product variant.
 *
 * Validates that the system enforces SKU code uniqueness within a product by rejecting update attempts that would create duplicate SKU codes. The test creates two variants with different SKU codes, then attempts to update the first variant's SKU to match the second variant's existing SKU. The system should reject this update with an appropriate error, leaving the first variant's SKU unchanged and preventing any snapshot creation since the update failed.
 *
 * This test ensures the composite unique constraint on (shopping_mall_product_id, sku_code) is properly enforced, maintaining inventory tracking accuracy and preventing order processing conflicts that could arise from duplicate SKU codes.
 *
 * 1. Seller authenticates and registers on the platform.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller creates first variant with SKU code "SKU-001" and options.
 * 4. Seller creates second variant with SKU code "SKU-002" and different options.
 * 5. Seller attempts to update first variant's SKU to "SKU-002" (duplicate).
 * 6. System rejects the update with an error (409 Conflict or similar).
 * 7. First variant's SKU code remains "SKU-001" (unchanged, verified by failed update).
 * 8. No snapshot is created for the failed update attempt.
 */
export async function test_api_product_variant_update_sku_uniqueness_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
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
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create first variant with SKU "SKU-001"
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "SKU-001",
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant1);
  // 4. Create second variant with SKU "SKU-002"
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "SKU-002",
          variantOptions: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
          initialStockQuantity: 20,
        },
      },
    );
  typia.assert(variant2);
  // 5. Attempt to update variant1's SKU to match variant2's SKU (should fail)
  await TestValidator.error("SKU uniqueness violation rejected", async () => {
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant1.id,
        body: {
          sku_code: variant2.sku_code,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  });
}
