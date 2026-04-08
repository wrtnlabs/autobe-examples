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
 * Test that a seller can retrieve a specific inventory record for one of their product variants.
 *
 * Validates the complete inventory record retrieval workflow including seller authentication, product creation, variant creation, inventory record creation, and record retrieval. Ensures that the inventory record correctly contains the quantity change amount, reason for the change, timestamps, and the complete product variant information including SKU code, price, options, and current stock quantity.
 *
 * Special attention is given to verifying that the productVariant relation in the inventory record response matches the variant that was created and that the stock_quantity field reflects the correct calculated value from all inventory records for that variant.
 *
 * 1. Seller authenticates and joins the shopping mall platform.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller creates a variant for the product with SKU code, options, and initial stock.
 * 4. Seller creates an inventory record by adding stock to the variant.
 * 5. Seller retrieves the specific inventory record using the record ID.
 * 6. Validates that the inventory record contains complete information including quantity_change, reason, timestamps, and productVariant relation.
 */
export async function test_api_inventory_record_retrieve_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variant);
  // 4. Create an inventory record by adding stock
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {},
      },
    );
  typia.assert(inventoryRecord);
  // 5. Retrieve the specific inventory record
  const retrievedRecord =
    await api.functional.shoppingMall.seller.products.variants.inventory.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        recordId: inventoryRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // 6. Validate inventory record structure and content
  TestValidator.equals(
    "record ID matches",
    retrievedRecord.id,
    inventoryRecord.id,
  );
  TestValidator.equals(
    "quantity change matches",
    retrievedRecord.quantity_change,
    inventoryRecord.quantity_change,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRecord.reason,
    inventoryRecord.reason,
  );
  TestValidator.equals(
    "product variant ID matches",
    retrievedRecord.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "SKU code matches",
    retrievedRecord.productVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.predicate(
    "stock quantity is positive",
    retrievedRecord.productVariant.stock_quantity > 0,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    retrievedRecord.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    retrievedRecord.updated_at !== undefined,
  );
}
