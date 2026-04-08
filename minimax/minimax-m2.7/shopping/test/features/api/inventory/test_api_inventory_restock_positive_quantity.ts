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
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test successful inventory restocking with positive quantity change.
 *
 * Validates the complete inventory restocking workflow for a seller:
 * 1. Admin creates a category for product assignment
 * 2. Seller registers with pending status and gets approved
 * 3. Approved seller creates a product with the category
 * 4. Seller creates a product variant (initial quantity is 0)
 * 5. Seller calls inventory restock endpoint with positive quantityChange=100
 * 6. Verifies inventory record is created with correct positive quantityChange
 * 7. Verifies inventory record reason matches "new shipment"
 * 8. Verifies the variant quantity reflects the restocked amount
 *
 * This test ensures positive inventory changes are properly recorded and
 * the variant stock is correctly updated.
 */
export async function test_api_inventory_restock_positive_quantity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for category creation and seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create product category
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Register seller with password
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: { password: sellerPassword },
  });
  typia.assert(sellerAuth);
  // 4. Admin approves seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: sellerAuth.id },
    );
  typia.assert(approvedSeller);
  // 5. Login as approved seller using stored password
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 6. Create product with category
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      { body: { categoryId: category.id } },
    );
  typia.assert(product);
  // 7. Create product variant (initial stock is 0)
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { skuCode: RandomGenerator.alphaNumeric(10) },
      },
    );
  typia.assert(variant);
  // 8. Verify initial variant quantity is 0 (out of stock)
  TestValidator.equals("initial variant quantity is 0", variant.quantity, 0);
  TestValidator.equals("product is out of stock", product.inStock, false);
  // 9. Restock inventory with positive quantity
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantityChange: 100,
          reason: "new shipment",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 10. Validate inventory record created with positive quantityChange
  TestValidator.equals(
    "quantityChange is 100",
    inventoryRecord.quantityChange,
    100,
  );
  TestValidator.equals(
    "reason matches new shipment",
    inventoryRecord.reason,
    "new shipment",
  );
  TestValidator.predicate(
    "quantityChange is positive",
    inventoryRecord.quantityChange > 0,
  );
  // 11. Validate variant quantity updated to 100
  TestValidator.equals("variant quantity is 100", variant.quantity, 100);
}
