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
import { generate_random_ecommerce_mall_seller_products_variants_inventory_adjust } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_adjust";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test the adjustment inventory operation where a seller subtracts stock
 * from a product variant for corrections.
 *
 * Preconditions: Seller must be authenticated, own a product with a variant
 * that has existing stock.
 *
 * Steps:
 * 1. Register a new seller account and authenticate
 * 2. Create a new product with required fields
 * 3. Create a product variant with unique SKU
 * 4. First restock the variant with 50 units for 'New stock received'
 * 5. Then perform adjustment operation: operation='adjust', quantity=10,
 *    reason='Damaged goods correction'
 *
 * Expected Results:
 * - HTTP 200 OK response for both operations
 * - First restock creates record with quantity_change=+50,
 *   calculated_stock_quantity=50
 * - Adjustment creates record with quantity_change=-10,
 *   calculated_stock_quantity=40
 * - Both records have correct reasons preserved in audit trail
 */
export async function test_api_inventory_adjust_variant_correction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Create a new product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a product variant with unique SKU
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. First restock the variant with 50 units for 'New stock received'
  const restockRecord =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          operation: "restock",
          quantity: 50,
          reason: "New stock received",
        },
      },
    );
  typia.assert(restockRecord);
  // Validate restock record
  TestValidator.equals(
    "restock quantity_change is +50",
    restockRecord.quantity_change,
    50,
  );
  TestValidator.equals(
    "restock calculated_stock_quantity is 50",
    restockRecord.calculated_stock_quantity,
    50,
  );
  TestValidator.equals(
    "restock reason preserved",
    restockRecord.reason,
    "New stock received",
  );
  // 5. Perform adjustment operation to subtract 10 units
  const adjustRecord =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_adjust(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          operation: "adjust",
          quantity: 10,
          reason: "Damaged goods correction",
        },
      },
    );
  typia.assert(adjustRecord);
  // Validate adjustment record
  TestValidator.equals(
    "adjust quantity_change is -10",
    adjustRecord.quantity_change,
    -10,
  );
  TestValidator.equals(
    "adjust calculated_stock_quantity is 40",
    adjustRecord.calculated_stock_quantity,
    40,
  );
  TestValidator.equals(
    "adjust reason preserved",
    adjustRecord.reason,
    "Damaged goods correction",
  );
}
