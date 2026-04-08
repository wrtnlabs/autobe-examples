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
 * Test successfully retrieving a specific inventory record for a product variant as the owning seller.
 *
 * This test validates the complete workflow of:
 * 1. Administrator creating a category for product classification
 * 2. Seller registering and authenticating on the platform
 * 3. Seller creating a product with the category
 * 4. Seller creating a product variant with unique SKU code
 * 5. Seller adding inventory to the variant (positive quantity for restock)
 * 6. Retrieving the specific inventory record using the inventory history endpoint
 *
 * The test verifies that the owning seller can successfully retrieve an inventory record
 * they previously created, and that the response contains all expected fields including
 * the record ID, quantity change, business reason, and creation timestamp.
 *
 * 1. Admin creates category for product classification.
 * 2. Seller registers with email and credentials.
 * 3. Seller creates a product with the category.
 * 4. Seller creates a product variant with unique SKU.
 * 5. Seller adds inventory (restock) to the variant.
 * 6. Seller retrieves the inventory record by variantId and recordId.
 * 7. Validates response contains: id, quantityChange, reason, createdAt.
 */
export async function test_api_inventory_record_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // 1. Admin Setup - Create admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create category for product
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller Setup - Register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 4. Create product with category
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
  // 5. Create product variant with unique SKU
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 6. Add inventory to the variant (restock with positive quantity)
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantityChange: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "restock from supplier",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 7. Retrieve the inventory record
  const retrievedRecord =
    await api.functional.ecommerceMall.seller.variants.inventory.at(
      sellerConnection,
      {
        variantId: variant.id,
        recordId: inventoryRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // 8. Validate response
  TestValidator.equals(
    "record id matches",
    retrievedRecord.id,
    inventoryRecord.id,
  );
  TestValidator.predicate(
    "quantity change is positive",
    retrievedRecord.quantityChange > 0,
  );
  TestValidator.predicate(
    "reason is non-empty string",
    retrievedRecord.reason.length > 0,
  );
  TestValidator.predicate(
    "createdAt is valid timestamp",
    !isNaN(Date.parse(retrievedRecord.createdAt)),
  );
}
