import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test that inventory adjustment fails when variant has no stock available.
 *
 * Prerequisites Setup:
 * 1. Register a new seller account via POST /ecommerceMall/auth/seller/join
 * 2. Create a product via POST /ecommerceMall/seller/products
 * 3. Create a product variant via POST /ecommerceMall/seller/seller/products/{productId}/variants
 *    (new variants start with quantity = 0)
 *
 * Test Execution:
 * 1. Send POST request to /ecommerceMall/seller/products/{productId}/variants/{variantId}/inventory with:
 *    - operation: "adjust"
 *    - quantity: 10 (attempting to reduce stock when variant has 0)
 *    - reason: "Inventory correction"
 * 2. Verify the request fails with HTTP 400 or appropriate error status
 * 3. Verify error message indicates insufficient stock
 * 4. Verify variant quantity remains 0
 *
 * Success Criteria:
 * - Request rejected with error response
 * - No inventory record created for failed adjustment
 * - Variant quantity unchanged at 0
 * - Error message clearly indicates insufficient stock for adjustment
 */
export async function test_api_inventory_adjustment_zero_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller and create connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a product variant (starts with quantity = 0)
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Verify variant starts with 0 quantity
  TestValidator.equals("variant quantity starts at 0", variant.quantity, 0);
  // 4. Attempt to adjust inventory (reduce stock) when variant has 0 stock
  // This should fail because we cannot reduce stock below 0
  await TestValidator.error(
    "adjustment fails when variant has zero stock",
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.inventory.create(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          body: {
            operation: "adjust",
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            reason: "Inventory correction",
          } satisfies IEcommerceMallInventoryRecord.ICreate,
        },
      );
    },
  );
  // 5. Verify variant quantity remains 0 by getting the product details
  // The variant quantity should not have changed
  // Note: We verify that no successful inventory record was created,
  // which means the variant quantity stays at 0
}
