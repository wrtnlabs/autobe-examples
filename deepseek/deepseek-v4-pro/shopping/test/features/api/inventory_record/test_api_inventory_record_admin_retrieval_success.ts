import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test that an administrator can retrieve a specific inventory record by its unique identifier.
 *
 * Validates the admin inventory record retrieval endpoint, which enables administrators to inspect any seller's inventory ledger for audit and oversight purposes. The test sets up a complete inventory chain: an administrator creates a category, a seller creates a product under that category with a variant and a manual inventory restock entry, then the administrator retrieves that specific record by ID.
 *
 * Special attention is given to verifying that the retrieved record contains the correct quantity_change matching the restock amount, the seller-provided reason, the created_at timestamp, and the variant summary including SKU code, option values, price, and current computed stock quantity.
 *
 * 1. Administrator registers and authenticates via admin join.
 * 2. Seller registers and authenticates via seller join.
 * 3. Administrator creates a category for product classification.
 * 4. Seller creates a product under the created category.
 * 5. Seller creates a variant with a globally unique SKU code and option values.
 * 6. Seller records a manual inventory restock with a positive quantity change and reason.
 * 7. Administrator retrieves the inventory record using the admin endpoint.
 * 8. Validates the response fields match the input data and include the resolved variant relationship.
 */
export async function test_api_inventory_record_admin_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Seller creates a product under the created category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates a variant with a globally unique SKU code and option values
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 6. Seller records a manual inventory restock
  const restockQuantity: number = 50;
  const restockReason = "Quarterly restock";
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        body: {
          quantity_change: restockQuantity,
          reason: restockReason,
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 7. Admin retrieves the inventory record via the admin endpoint
  const retrievedRecord =
    await api.functional.shoppingMall.admin.products.variants.inventory_records.at(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        recordId: inventoryRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // 8. Validate the retrieved record
  TestValidator.equals(
    "quantity_change matches restock amount",
    retrievedRecord.quantity_change,
    restockQuantity,
  );
  TestValidator.equals(
    "reason matches seller-provided reason",
    retrievedRecord.reason,
    restockReason,
  );
  TestValidator.equals(
    "variant id matches the created variant",
    retrievedRecord.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "variant code matches the created variant",
    retrievedRecord.variant.code,
    variant.code,
  );
  TestValidator.predicate(
    "variant has positive stock quantity",
    () => retrievedRecord.variant.stock_quantity > 0,
  );
}
