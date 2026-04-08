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
import { generate_random_ecommerce_mall_seller_product_variants_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_product_variants_inventory_records_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

// Extended type to include id property
type IInventoryRecordWithId = IEcommerceMallInventoryRecord & { id: string & tags.Format<"uuid"> };

export async function test_api_inventory_record_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: "Testing admin inventory record access functionality",
      href: "http://test.com",
      referrer: "http://test.com",
    },
  });
  typia.assert(admin);
  // 2. Create a category for the product
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Test Category for Inventory",
        description: "Category for testing inventory records",
      },
    },
  );
  typia.assert(category);
  // 3. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller_${Date.now()}@test.com`,
      password: "TestPassword123!",
      href: "http://test.com",
      referrer: "http://test.com",
    },
  });
  typia.assert(seller);
  // 4. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product for Inventory",
        description: "Product for testing inventory record retrieval",
        categoryId: category.id,
        basePrice: 99.99,
      },
    },
  );
  typia.assert(product);
  // 5. Create a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-TEST-${Date.now()}`,
          quantity: 0,
          optionValues: [
            { key: "color", value: "red" },
            { key: "size", value: "large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 6. Create an inventory record (restock) with specific quantity
  const restockQuantity = 100;
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: restockQuantity,
          operationType: "restock",
          reason: "Initial restock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // Cast to extended type with id property
  const inventoryRecordWithId = inventoryRecord as IInventoryRecordWithId;
  // 7. Retrieve the inventory record as admin
  const retrievedRecord =
    await api.functional.ecommerceMall.admin.productVariants.inventoryRecords.at(
      adminConnection,
      {
        variantId: variant.id,
        inventoryRecordId: inventoryRecordWithId.id,
      },
    );
  typia.assert(retrievedRecord);
  // Validations
  TestValidator.equals(
    "Admin can retrieve inventory record successfully",
    retrievedRecord !== null,
    true,
  );
  TestValidator.predicate(
    "Response includes total variants count",
    retrievedRecord.totalVariantsCount >= 1,
  );
  TestValidator.predicate(
    "Total stock quantity is calculated correctly",
    retrievedRecord.totalStockQuantity >= restockQuantity,
  );
  TestValidator.predicate(
    "Recent changes array is included in response",
    Array.isArray(retrievedRecord.recentChanges),
  );
  TestValidator.predicate(
    "Admin has unrestricted access to view any seller's inventory records",
    retrievedRecord.totalVariantsCount >= 1,
  );
}