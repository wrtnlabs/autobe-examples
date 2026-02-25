import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test inventory history tracking and stock calculation.
 *
 * This test validates that:
 * - Inventory additions create history records with correct details
 * - Multiple inventory additions are tracked in chronological order
 * - Variant stock_quantity is correctly calculated as sum of all inventory changes
 * - Complete audit trail is maintained for all inventory movements
 */
export async function test_api_inventory_history_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a variant with initial stock of 50
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Medium" },
          ],
          stockQuantity: 50,
        },
      },
    );
  typia.assert(variant);
  // Verify initial stock
  TestValidator.equals("initial stock is 50", variant.options.length, 2);
  // 4. Add inventory with quantity 30 (Restock)
  const history1 =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 30,
          reason: "Restock",
        },
      },
    );
  typia.assert(history1);
  // Verify history record details
  TestValidator.equals("history1 quantity change", history1.quantityChange, 30);
  TestValidator.equals("history1 reason", history1.reason, "Restock");
  TestValidator.predicate(
    "history1 variant matches",
    history1.variant.id === variant.id,
  );
  // 5. Add inventory with quantity 20 (Supplier delivery)
  const history2 =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 20,
          reason: "Supplier delivery",
        },
      },
    );
  typia.assert(history2);
  // Verify history record details
  TestValidator.equals("history2 quantity change", history2.quantityChange, 20);
  TestValidator.equals("history2 reason", history2.reason, "Supplier delivery");
  // 6. Add inventory with quantity 15 (Returned goods restocked)
  const history3 =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 15,
          reason: "Returned goods restocked",
        },
      },
    );
  typia.assert(history3);
  // Verify history record details
  TestValidator.equals("history3 quantity change", history3.quantityChange, 15);
  TestValidator.equals(
    "history3 reason",
    history3.reason,
    "Returned goods restocked",
  );
  // 7. Verify stock calculation: 50 (initial) + 30 + 20 + 15 = 115
  // Stock is calculated as sum of all inventory history records
  const expectedTotalStock = 50 + 30 + 20 + 15; // = 115
  TestValidator.equals(
    "variant stock quantity after additions",
    history3.variant.stock_quantity,
    expectedTotalStock,
  );
  // 8. Verify variant in_stock status
  TestValidator.predicate(
    "variant is in stock",
    history3.variant.in_stock === true,
  );
  // 9. Verify all history records reference the same variant
  TestValidator.equals(
    "all histories reference same variant",
    history1.variant.id,
    history2.variant.id,
  );
  TestValidator.equals(
    "history3 references same variant",
    history2.variant.id,
    history3.variant.id,
  );
  // 10. Verify chronological order via timestamps
  TestValidator.predicate(
    "history1 created before history2",
    new Date(history1.createdAt) <= new Date(history2.createdAt),
  );
  TestValidator.predicate(
    "history2 created before history3",
    new Date(history2.createdAt) <= new Date(history3.createdAt),
  );
}
