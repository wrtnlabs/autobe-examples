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

export async function test_api_inventory_record_administrator_oversight(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create seller with product, variant, and inventory record
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Create category using administrator connection
  const adminSetupConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminSetupConnection, {});
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminSetupConnection,
      {},
    );
  // Seller creates product, variant, and inventory record
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1> & tags.Maximum<100000>
        >(),
      },
    },
  );
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          optionValues: { color: "Red", size: "M" },
          price: null,
        },
      },
    );
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial stock from supplier for oversight test",
        },
      },
    );
  // Create a separate administrator for oversight testing
  const oversightAdminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(oversightAdminConnection, {});
  // Administrator retrieves the seller's inventory record
  const retrievedRecord =
    await api.functional.shoppingMall.seller.variants.inventory_records.at(
      oversightAdminConnection,
      {
        variantId: variant.id,
        inventoryRecordId: inventoryRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // Validate: Administrator can access records for variants owned by any seller
  TestValidator.equals(
    "record ID matches",
    retrievedRecord.id,
    inventoryRecord.id,
  );
  TestValidator.equals(
    "variant ID matches",
    retrievedRecord.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "quantity change matches",
    retrievedRecord.quantityChange,
    inventoryRecord.quantityChange,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRecord.reason,
    inventoryRecord.reason,
  );
  // Validate: Seller field shows the original seller's information
  TestValidator.predicate(
    "seller information is present",
    retrievedRecord.seller !== null,
  );
  if (retrievedRecord.seller !== null) {
    TestValidator.equals(
      "seller ID matches original seller",
      retrievedRecord.seller.id,
      sellerAuth.id,
    );
    TestValidator.equals(
      "seller shop name matches",
      retrievedRecord.seller.shop_name,
      sellerAuth.shopName,
    );
  }
  // Validate: Record contains all required fields
  TestValidator.predicate(
    "record has variant information",
    retrievedRecord.variant !== undefined,
  );
  TestValidator.predicate(
    "record has quantity change",
    typeof retrievedRecord.quantityChange === "number",
  );
  TestValidator.predicate(
    "record has reason",
    retrievedRecord.reason.length > 0,
  );
  TestValidator.predicate(
    "record has created timestamp",
    retrievedRecord.createdAt !== undefined,
  );
}
