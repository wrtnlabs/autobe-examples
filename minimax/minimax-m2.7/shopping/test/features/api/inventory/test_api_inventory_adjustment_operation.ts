import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_adjustment_operation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  await authorize_seller_login(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller1234",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Seller creates a product with the category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant with initial stock of 0
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          quantity: 0,
          optionValues: [{ key: "size", value: "large" }],
        },
      },
    );
  typia.assert(variant);
  // Verify initial stock is 0
  TestValidator.equals(
    "initial variant quantity should be 0",
    variant.quantity,
    0,
  );
  // First operation - Restock: Add 100 units
  const restockRecord =
    await generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 100,
          operationType: "restock",
          reason: "bulk restock from warehouse",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(restockRecord);
  // Verify restock created a positive quantity_change in recentChanges
  const restockChange = restockRecord.recentChanges.find(
    (change) => change.reason === "bulk restock from warehouse",
  );
  TestValidator.equals(
    "restock quantity_change should be positive 100",
    restockChange?.quantityChange,
    100,
  );
  TestValidator.equals(
    "restock variant SKU matches",
    restockChange?.variantSku,
    variant.skuCode,
  );
  // Verify current stock after restock is 100
  TestValidator.equals(
    "total stock quantity after restock should be 100",
    restockRecord.totalStockQuantity,
    100,
  );
  // Second operation - Adjustment: Remove 5 units (damaged goods correction)
  const adjustmentRecord =
    await generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 5,
          operationType: "adjustment",
          reason: "damaged goods correction",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(adjustmentRecord);
  // Verify adjustment created a negative quantity_change in recentChanges
  const adjustmentChange = adjustmentRecord.recentChanges.find(
    (change) => change.reason === "damaged goods correction",
  );
  TestValidator.equals(
    "adjustment quantity_change should be negative -5",
    adjustmentChange?.quantityChange,
    -5,
  );
  TestValidator.equals(
    "adjustment variant SKU matches",
    adjustmentChange?.variantSku,
    variant.skuCode,
  );
  TestValidator.equals(
    "adjustment product name matches",
    adjustmentChange?.productName,
    product.name,
  );
  // Verify both inventory records exist in the history
  const recentChanges = adjustmentRecord.recentChanges;
  const restockInAdjustment = recentChanges.find(
    (change) => change.reason === "bulk restock from warehouse",
  );
  TestValidator.notEquals(
    "restock record should still exist after adjustment",
    restockInAdjustment,
    null,
  );
  TestValidator.equals(
    "restock quantity preserved in history",
    restockInAdjustment?.quantityChange,
    100,
  );
  // Verify current stock is 95 (100 - 5)
  TestValidator.equals(
    "total stock quantity after adjustment should be 95",
    adjustmentRecord.totalStockQuantity,
    95,
  );
  // Verify total variants count remains the same
  TestValidator.equals(
    "total variants count unchanged after operations",
    adjustmentRecord.totalVariantsCount,
    restockRecord.totalVariantsCount,
  );
  // Verify timestamps exist for audit trail
  TestValidator.predicate(
    "restock change has timestamp",
    restockChange?.createdAt !== undefined && restockChange?.createdAt !== null,
  );
  TestValidator.predicate(
    "adjustment change has timestamp",
    adjustmentChange?.createdAt !== undefined &&
      adjustmentChange?.createdAt !== null,
  );
}
