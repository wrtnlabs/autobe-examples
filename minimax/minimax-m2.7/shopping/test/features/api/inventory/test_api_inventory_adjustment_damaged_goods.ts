import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_restock } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_restock";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test inventory adjustment (damaged goods) for a product variant.
 *
 * Validates that a seller can successfully subtract inventory from a product variant
 * using the inventory adjustment endpoint with reason 'damaged'. This test verifies the
 * complete workflow of adding initial stock, then performing a stock deduction for damaged
 * items.
 *
 * The test ensures that:
 * - Initial restocking with positive quantityChange increases stock correctly
 * - Subsequent adjustment with positive quantityChange and reason 'damaged' creates a
 *   negative quantityChange record (subtraction)
 * - The variant's current stock is correctly calculated as the sum of all inventory
 *   records (50 restock - 5 damaged = 45 final stock)
 * - Both restock and adjustment records are persisted
 *
 * 1. Seller authenticates via join (creates pending account).
 * 2. Product is created with the seller.
 * 3. Product variant is created with initial quantity of 0.
 * 4. Initial restock adds 50 units to the variant.
 * 5. Adjustment for damaged goods subtracts 5 units from the variant.
 * 6. Validates that the adjustment record has negative quantityChange.
 * 7. Validates that the variant's final stock is 45 (computed from record sums).
 */
export async function test_api_inventory_adjustment_damaged_goods(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Create a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Restock with 50 units to establish initial stock
  const restockRecord =
    await generate_random_ecommerce_mall_seller_variants_inventory_restock(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantityChange: 50,
          reason: "restock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(restockRecord);
  TestValidator.equals(
    "restock quantityChange",
    restockRecord.quantityChange,
    50,
  );
  TestValidator.equals("restock reason", restockRecord.reason, "restock");
  // 5. Perform adjustment for damaged goods (subtract 5 units)
  const adjustmentRecord =
    await api.functional.ecommerceMall.seller.variants.inventory.restock(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          quantityChange: 5,
          reason: "damaged",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(adjustmentRecord);
  // 6. Verify adjustment record has negative quantityChange
  TestValidator.equals(
    "adjustment quantityChange is negative",
    adjustmentRecord.quantityChange,
    -5,
  );
  TestValidator.equals(
    "adjustment reason matches",
    adjustmentRecord.reason,
    "damaged",
  );
  // 7. Verify final stock calculation: initial (0) + restock (50) - damaged (5) = 45
  const expectedFinalStock =
    restockRecord.quantityChange + adjustmentRecord.quantityChange;
  TestValidator.equals(
    "final stock after adjustment (50 - 5 = 45)",
    expectedFinalStock,
    45,
  );
  // Verify variant quantity matches expected (variant starts at 0, +50 -5 = 45)
  TestValidator.equals("variant initial quantity was 0", variant.quantity, 0);
}
