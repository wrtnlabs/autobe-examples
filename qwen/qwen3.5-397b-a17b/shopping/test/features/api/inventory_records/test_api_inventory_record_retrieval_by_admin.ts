import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test administrator retrieval of specific inventory record by ID.
 *
 * Validates the complete inventory record retrieval flow including administrative setup, seller product creation, variant management, and inventory tracking. Ensures that administrators can access inventory records across all sellers for platform-wide oversight and audit trail verification.
 *
 * Special attention is given to verifying that the inventory record contains complete immutable audit trail data including quantity delta, reason code, product variant reference, and creation timestamp. The test confirms that the retrieved record exactly matches the original creation data.
 *
 * 1. Administrator registers and authenticates via admin join endpoint.
 * 2. Administrator creates a product category for catalog organization.
 * 3. Seller registers and authenticates via seller join endpoint.
 * 4. Seller creates a product referencing the admin-created category.
 * 5. Seller creates a product variant with SKU code and option values.
 * 6. Seller creates an inventory record with positive quantity delta and RESTOCK reason.
 * 7. Administrator retrieves the inventory record using variant ID and record ID.
 * 8. Validates all fields match original creation data and audit trail is complete.
 */
export async function test_api_inventory_record_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  // 2. Admin creates category for product organization
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller setup - create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller creates product with the admin-created category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates product variant for inventory tracking
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 6. Seller creates inventory record with RESTOCK reason
  const quantityDelta = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const reason = "RESTOCK";
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_delta: quantityDelta,
          reason: reason,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 7. Admin retrieves the inventory record
  const retrievedRecord =
    await api.functional.shoppingMall.admin.variants.inventory_records.at(
      adminConnection,
      {
        variantId: variant.id,
        recordId: inventoryRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // 8. Validate retrieved record matches original creation data
  TestValidator.equals(
    "record ID matches",
    retrievedRecord.id,
    inventoryRecord.id,
  );
  TestValidator.equals(
    "quantity delta matches",
    retrievedRecord.quantityDelta,
    quantityDelta,
  );
  TestValidator.equals("reason matches", retrievedRecord.reason, reason);
  TestValidator.equals(
    "variant ID matches",
    retrievedRecord.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "SKU code matches",
    retrievedRecord.productVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "option values match",
    retrievedRecord.productVariant.option_values,
    variant.option_values,
  );
  TestValidator.predicate("createdAt is valid ISO timestamp", () => {
    const date = new Date(retrievedRecord.createdAt);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate(
    "stock quantity is non-negative",
    retrievedRecord.productVariant.stock_quantity >= 0,
  );
}
