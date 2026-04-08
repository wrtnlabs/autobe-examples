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
 * Test that attempting to adjust inventory below zero is rejected by the system.
 *
 * Validates the business rule that prevents negative inventory levels by ensuring
 * the system rejects inventory adjustments that would result in stock falling below zero.
 *
 * The test flow involves:
 * 1. Admin account setup for category creation
 * 2. Seller login (assuming seller is pre-approved in test environment)
 * 3. Category creation by admin
 * 4. Product and variant creation by approved seller
 * 5. Initial restock with limited stock (50 units)
 * 6. Attempted adjustment exceeding current stock (-100 units)
 * 7. Verification of rejection via error response
 *
 * This ensures data integrity by preventing inventory from going negative.
 */
export async function test_api_inventory_adjustment_exceeds_available_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 2. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "Password123!";
  // Register seller
  await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  // Login seller (assuming auto-approval in test environment)
  const sellerAuth = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/login",
      referrer: "https://example.com/register",
    },
  });
  // 3. Admin creates a test category
  const category =
    await api.functional.ecommerceMall.admin.admin.categories.create(
      adminConnection,
      {
        body: {
          name: `Test Category ${Date.now()}`,
          description: "Category for inventory adjustment testing",
        } satisfies api.functional.ecommerceMall.admin.admin.categories.create.Body,
      },
    );
  typia.assert(category);
  // 4. Seller creates a product
  const product =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      sellerConnection,
      {
        body: {
          name: `Test Product ${Date.now()}`,
          description: "Product for inventory adjustment testing",
          basePrice: 10000,
          categoryId: category.id,
        } satisfies api.functional.ecommerceMall.seller.sellers.me.products.create.Body,
      },
    );
  typia.assert(product);
  // 5. Seller creates a product variant
  const variant =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: `SKU-TEST-${Date.now()}`,
          optionValues: [{ key: "Size", value: "Large" }],
        } satisfies api.functional.ecommerceMall.seller.sellers.me.products.variants.create.Body,
      },
    );
  typia.assert(variant);
  // 6. Seller restocks the variant with +50 units (limited stock)
  const restockRecord =
    await api.functional.ecommerceMall.seller.sellers.me.variants._inventory.add(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          quantityChange: 50,
          reason: "Initial restock for testing",
        } satisfies api.functional.ecommerceMall.seller.sellers.me.variants._inventory.add.Body,
      },
    );
  typia.assert(restockRecord);
  TestValidator.equals(
    "restock quantity is positive",
    restockRecord.quantityChange,
    50,
  );
  // 7. Seller attempts to adjust inventory by -100 units (exceeds current stock of 50)
  // This should be rejected by the system because 100 > 50
  await TestValidator.error(
    "adjustment exceeding stock should be rejected",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.variants._inventory.add(
        sellerConnection,
        {
          variantId: variant.id,
          body: {
            quantityChange: -100,
            reason: "Inventory correction - attempted over-adjustment",
          } satisfies api.functional.ecommerceMall.seller.sellers.me.variants._inventory.add.Body,
        },
      );
    },
  );
}
