import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller can successfully retrieve a specific inventory record for a variant they own.
 *
 * Validates the complete inventory record retrieval flow including seller authentication, product and variant creation, inventory record creation through restocking, and successful retrieval of the inventory record with all required fields. Ensures that the inventory record correctly references the variant and contains accurate quantity delta, reason, and timestamp information.
 *
 * Special attention is given to verifying that the productVariant relation includes complete variant context with SKU code, option values, and computed stock quantity, and that the seller ownership chain is correctly maintained throughout the product-variant-inventory record hierarchy.
 *
 * 1. Seller registers and authenticates using authorize_seller_join utility.
 * 2. Seller creates a product using generate_random_shopping_mall_seller_products_create utility.
 * 3. Seller creates a variant for the product using generate_random_shopping_mall_seller_products_variants_create utility.
 * 4. Seller creates an inventory record (restock) using generate_random_shopping_mall_seller_variants_inventory_records_create utility.
 * 5. Seller retrieves the inventory record using the GET endpoint.
 * 6. Validates inventory record id, quantityDelta, reason, and createdAt match creation data.
 * 7. Validates productVariant contains correct variant information and seller ownership chain.
 */
export async function test_api_inventory_record_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
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
      },
    );
  typia.assert(variant);
  // 4. Create an inventory record (restock)
  const restockQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const reasonCode = RandomGenerator.pick([
    "RESTOCK",
    "ADJUSTMENT",
    "ORDER_CANCELLATION",
    "ORDER_REFUND",
  ] as const);
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_delta: restockQuantity,
          reason: reasonCode,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Retrieve the inventory record using GET endpoint
  const retrievedRecord =
    await api.functional.shoppingMall.seller.variants.inventory_records.at(
      sellerConnection,
      {
        variantId: variant.id,
        recordId: inventoryRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // 6. Validate inventory record fields match creation data
  TestValidator.equals(
    "inventory record id",
    retrievedRecord.id,
    inventoryRecord.id,
  );
  TestValidator.equals(
    "quantity delta matches",
    retrievedRecord.quantityDelta,
    restockQuantity,
  );
  TestValidator.equals("reason matches", retrievedRecord.reason, reasonCode);
  TestValidator.predicate("createdAt is valid timestamp", () => {
    const date = new Date(retrievedRecord.createdAt);
    return !isNaN(date.getTime());
  });
  // 7. Validate productVariant contains correct variant information
  TestValidator.equals(
    "productVariant id matches variantId",
    retrievedRecord.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "productVariant sku_code matches",
    retrievedRecord.productVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "productVariant option_values matches",
    retrievedRecord.productVariant.option_values,
    variant.option_values,
  );
  // 8. Validate seller ownership chain
  TestValidator.equals(
    "productVariant.product.seller.id matches seller",
    retrievedRecord.productVariant.product.seller.id,
    sellerAuth.id,
  );
  // 9. Validate stock quantity is correctly computed (should equal restock quantity for first record)
  TestValidator.equals(
    "stock_quantity equals restock quantity",
    retrievedRecord.productVariant.stock_quantity,
    restockQuantity,
  );
}
