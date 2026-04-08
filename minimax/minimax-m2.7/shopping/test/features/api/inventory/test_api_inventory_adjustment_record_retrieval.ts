import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test retrieving a negative inventory adjustment record (damaged goods correction).
 *
 * Validates the inventory record retrieval endpoint by creating a product with a variant,
 * performing both positive (restock) and negative (adjustment) inventory changes, then
 * retrieving the negative adjustment record to verify it contains correct data.
 *
 * **Setup Flow**:
 * 1. Administrator creates a product category (required for product creation).
 * 2. Seller registers and authenticates on the platform.
 * 3. Seller creates a product with the category.
 * 4. Seller creates a product variant with SKU and options.
 * 5. Seller adds positive inventory (restock from supplier).
 * 6. Seller adds negative inventory (adjustment for damaged goods correction).
 *
 * **Validation**:
 * - The negative inventory record is successfully retrieved with HTTP 200.
 * - The record ID matches the created adjustment record UUID.
 * - The quantityChange is a negative integer (damaged goods deduction).
 * - The reason field contains descriptive text about the adjustment.
 * - The createdAt timestamp is properly formatted.
 *
 * This test ensures that sellers can audit their inventory history, specifically
 * tracking negative adjustments for damaged, expired, or corrected inventory items.
 */
export async function test_api_inventory_adjustment_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [
            { key: "Color", value: "Red" },
            { key: "Size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 5. Seller adds positive inventory (restock from supplier)
  const positiveRecord =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantityChange: 100,
          reason: "Restock from supplier",
        },
      },
    );
  typia.assert(positiveRecord);
  // 6. Seller adds negative inventory (adjustment for damaged goods)
  const negativeRecord =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantityChange: -5,
          reason: "Damaged goods removed",
        },
      },
    );
  typia.assert(negativeRecord);
  // 7. Retrieve the negative adjustment record
  const retrievedRecord =
    await api.functional.ecommerceMall.seller.variants.inventory.at(
      sellerConnection,
      {
        variantId: variant.id,
        recordId: negativeRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // 8. Validate the retrieved record
  TestValidator.equals(
    "record ID matches adjustment record UUID",
    retrievedRecord.id,
    negativeRecord.id,
  );
  TestValidator.predicate(
    "quantity change is negative (adjustment deduction)",
    retrievedRecord.quantityChange < 0,
  );
  TestValidator.predicate(
    "reason describes the adjustment",
    retrievedRecord.reason.includes("damaged") ||
      retrievedRecord.reason.includes("adjustment"),
  );
  TestValidator.predicate(
    "createdAt is valid timestamp",
    retrievedRecord.createdAt.length > 0,
  );
}
