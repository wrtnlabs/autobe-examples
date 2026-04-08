import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
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
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test seller performing inventory adjustment with negative quantity change for damaged goods or losses.
 *
 * Validates that sellers can record negative inventory adjustments to account for damaged goods, losses, or other stock reductions. The test creates a product with a variant having initial stock, then performs a negative inventory adjustment and verifies the audit trail is correctly maintained.
 *
 * Special attention is given to verifying that negative quantity changes are properly recorded, the variant's inventory count decreases correctly, and the reason field documents the business context for the adjustment.
 *
 * 1. Register and authenticate as a seller.
 * 2. Create a product with name, description, and base price.
 * 3. Create a variant with initial stock quantity (e.g., 100 units).
 * 4. Verify variant has positive inventory_count.
 * 5. Perform inventory adjustment with negative quantity (e.g., -10 units).
 * 6. Validate the inventory record contains correct negative quantity_change and reason.
 * 7. Verify the variant's stock_quantity in the inventory record reflects the reduction.
 */
export async function test_api_inventory_adjustment_negative_quantity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // Verify variant has positive inventory
  TestValidator.predicate(
    "variant has positive initial stock",
    variant.inventory_count > 0,
  );
  const initialStock = variant.inventory_count;
  // 4. Perform negative inventory adjustment
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          quantity_change: -10,
          reason: "Inventory adjustment - damaged goods",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Validate inventory record
  TestValidator.equals(
    "quantity_change is negative",
    inventoryRecord.quantity_change,
    -10,
  );
  TestValidator.equals(
    "reason matches input",
    inventoryRecord.reason,
    "Inventory adjustment - damaged goods",
  );
  TestValidator.predicate(
    "inventory record has valid ID",
    inventoryRecord.id.length > 0,
  );
  TestValidator.predicate(
    "inventory record has created_at timestamp",
    inventoryRecord.created_at.length > 0,
  );
  TestValidator.predicate(
    "inventory record is not deleted",
    inventoryRecord.deleted_at === null,
  );
  // 6. Validate variant stock_quantity in inventory record reflects the reduction
  TestValidator.equals(
    "variant stock_quantity decreased by adjustment amount",
    inventoryRecord.productVariant.stock_quantity,
    initialStock - 10,
  );
  TestValidator.predicate(
    "variant stock_quantity is non-negative",
    inventoryRecord.productVariant.stock_quantity >= 0,
  );
}
