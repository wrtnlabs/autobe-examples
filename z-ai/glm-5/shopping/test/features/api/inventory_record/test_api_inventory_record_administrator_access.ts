import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_record_administrator_access(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator retrieval of an inventory record for platform oversight.
   *
   * This test validates that administrators can access inventory records for any
   * variant across all sellers, including complete record details with seller
   * attribution for manual adjustments.
   */
  // Prepare administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // Prepare seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Administrator creates a category
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1> & tags.Maximum<10000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Seller creates a variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          optionValues: {
            color: RandomGenerator.pick(["Red", "Blue", "Green"]),
          },
          price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
        },
      },
    );
  typia.assert(variant);
  // Define the inventory adjustment details
  const inventoryReason = RandomGenerator.paragraph({ sentences: 2 });
  const inventoryQuantityChange = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  // Seller creates a manual inventory adjustment record
  const createdRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: inventoryQuantityChange,
          reason: inventoryReason,
        },
      },
    );
  typia.assert(createdRecord);
  // Administrator retrieves the inventory record
  const retrievedRecord =
    await api.functional.shoppingMall.administrator.variants.inventory_records.at(
      adminConnection,
      {
        variantId: variant.id,
        inventoryRecordId: createdRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // Verify the inventory record details
  TestValidator.equals(
    "record id matches",
    retrievedRecord.id,
    createdRecord.id,
  );
  TestValidator.equals(
    "quantity change matches",
    retrievedRecord.quantityChange,
    inventoryQuantityChange,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRecord.reason,
    inventoryReason,
  );
  // Verify variant information
  TestValidator.equals(
    "variant id matches",
    retrievedRecord.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "variant sku code matches",
    retrievedRecord.variant.sku_code,
    variant.skuCode,
  );
  TestValidator.predicate(
    "variant has stock quantity",
    retrievedRecord.variant.stock_quantity >= 0,
  );
  // Verify seller attribution (manual adjustment)
  TestValidator.predicate(
    "seller reference is populated",
    retrievedRecord.seller !== null,
  );
  if (retrievedRecord.seller !== null) {
    TestValidator.equals(
      "seller id matches",
      retrievedRecord.seller.id,
      sellerAuth.id,
    );
  }
  // Verify automatic references are null for manual adjustments
  TestValidator.equals(
    "order is null for manual adjustment",
    retrievedRecord.order,
    null,
  );
  TestValidator.equals(
    "cancellationRequest is null for manual adjustment",
    retrievedRecord.cancellationRequest,
    null,
  );
  TestValidator.equals(
    "refundRequest is null for manual adjustment",
    retrievedRecord.refundRequest,
    null,
  );
  // Verify timestamps
  TestValidator.predicate(
    "created_at is valid",
    new Date(retrievedRecord.createdAt) instanceof Date,
  );
}
