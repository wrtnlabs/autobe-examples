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
 * Test seller restocking a product variant with positive quantity.
 *
 * Validates the inventory restocking workflow where a seller adds stock to an existing product variant. The test ensures that inventory records are properly created with positive quantity changes, maintaining an immutable audit trail for stock movements.
 *
 * Special attention is given to verifying that the inventory record captures the correct quantity change, reason text, and timestamps, and that the variant's inventory count is updated accordingly.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller creates a variant for the product with SKU code, options, and initial stock.
 * 4. Seller restocks the variant by creating an inventory record with positive quantity change.
 * 5. Validates the inventory record contains correct quantity, reason, and variant details.
 */
export async function test_api_inventory_restock_product_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
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
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 4. Restock the variant with positive quantity
  const restockQuantity = 50;
  const restockReason = "Restock from supplier shipment";
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          quantity_change: restockQuantity,
          reason: restockReason,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Validate inventory record
  TestValidator.equals(
    "quantity change matches restock amount",
    inventoryRecord.quantity_change,
    restockQuantity,
  );
  TestValidator.equals(
    "reason matches restock description",
    inventoryRecord.reason,
    restockReason,
  );
  TestValidator.predicate(
    "quantity change is positive for restocking",
    inventoryRecord.quantity_change > 0,
  );
  TestValidator.equals(
    "variant SKU matches",
    inventoryRecord.productVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.predicate(
    "inventory count increased",
    inventoryRecord.productVariant.stock_quantity >= 10 + restockQuantity,
  );
  TestValidator.predicate(
    "record is not deleted",
    inventoryRecord.deleted_at === null,
  );
}
