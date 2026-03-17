import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_admin_variants_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_admin_variants_inventory_records_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Administrator retrieves a specific inventory history record for a product variant to audit stock changes.
 * The test validates that the admin can access complete inventory record details including quantityChange,
 * reason, recordedAt, and currentStock snapshot.
 *
 * Setup: Create admin account, create category, create seller account, create product, create variant,
 * create inventory record (restock).
 * Execute: Admin calls GET endpoint with variantId and inventoryRecordId.
 * Validate: Response contains all inventory record fields with correct values, currentStock reflects the
 * cumulative sum after this record, recordedAt timestamp is in correct format, reason field documents
 * the change purpose.
 */
export async function test_api_admin_inventory_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // Login as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Create and authenticate seller
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Login as seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.seller.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.name(1),
            },
          ] satisfies IEcommerceMallProductVariantOption[],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Create inventory record (restock)
  const initialStock = variant.stockQuantity;
  const restockQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const inventoryRecord =
    await generate_random_ecommerce_mall_admin_variants_inventory_records_create(
      adminLoginConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantityChange: restockQuantity,
          reason: "restock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 7. Retrieve the inventory record as admin
  const retrievedRecord =
    await api.functional.ecommerceMall.admin.variants.inventory_records.at(
      adminLoginConnection,
      {
        variantId: variant.id,
        inventoryRecordId: inventoryRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // 8. Validate response contains all fields
  TestValidator.equals(
    "record ID matches",
    retrievedRecord.id,
    inventoryRecord.id,
  );
  TestValidator.equals(
    "variant ID matches",
    retrievedRecord.productVariantId,
    variant.id,
  );
  TestValidator.equals(
    "quantity change matches",
    retrievedRecord.quantityChange,
    restockQuantity,
  );
  TestValidator.equals("reason matches", retrievedRecord.reason, "restock");
  TestValidator.predicate(
    "recordedAt is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      retrievedRecord.recordedAt,
    ),
  );
  TestValidator.predicate(
    "currentStock is positive",
    retrievedRecord.currentStock > 0,
  );
  TestValidator.equals(
    "currentStock equals initial + restock",
    retrievedRecord.currentStock,
    initialStock + restockQuantity,
  );
  TestValidator.predicate(
    "productVariant exists",
    retrievedRecord.productVariant !== null &&
      retrievedRecord.productVariant !== undefined,
  );
  TestValidator.equals(
    "variant SKU code matches",
    retrievedRecord.productVariant.sku_code,
    variant.skuCode,
  );
}