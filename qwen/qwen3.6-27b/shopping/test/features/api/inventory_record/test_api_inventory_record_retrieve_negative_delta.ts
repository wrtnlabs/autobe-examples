import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_inventory_record } from "../../../prepare/prepare_random_ecommerce_platform_inventory_record";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test retrieval of a negative delta inventory record representing stock deduction.
 *
 * Validates the complete inventory record creation and retrieval workflow for negative quantity adjustments. An administrator creates a product category, then a seller creates a product and variant. The seller creates an inventory record with a negative quantity_delta representing an order fulfillment stock deduction, accompanied by a business reason explaining the stock removal.
 *
 * The test verifies that the immutable inventory ledger correctly stores and returns negative delta values, maintaining a complete audit trail for inventory tracking. Current stock is computed by summing all inventory records, so negative values reduce total availability.
 *
 * 1. Administrator authenticates and creates a product category.
 * 2. Seller joins and authenticates with the platform.
 * 3. Seller creates a product referencing the category.
 * 4. Seller creates a product variant with SKU and options.
 * 5. Seller creates an inventory record with negative quantity_delta.
 * 6. Seller retrieves the inventory record using path parameters.
 * 7. Validates all fields in the retrieved record match the created data.
 */
export async function test_api_inventory_record_retrieve_negative_delta(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://platform.test/admin",
      referrer: "https://platform.test/login",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerJoin);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "1234",
      href: "https://platform.test/seller",
      referrer: "https://platform.test/login",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 3. Seller creates a product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 5. Seller creates an inventory record with NEGATIVE quantity_delta (stock deduction)
  const quantityDelta = -5;
  const inventory =
    await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_delta: quantityDelta,
          reason: "Order fulfillment deduction - batch #2024-0427",
        },
      },
    );
  typia.assert(inventory);
  TestValidator.equals(
    "negative delta stored correctly",
    inventory.quantity_delta,
    quantityDelta,
  );
  // 6. Seller retrieves the specific inventory record
  const retrieved =
    await api.functional.ecommercePlatform.seller.products.variants.inventory.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        inventoryId: inventory.id,
      },
    );
  typia.assert(retrieved);
  // 7. Validate retrieved inventory record
  TestValidator.equals("inventory id matches", retrieved.id, inventory.id);
  TestValidator.equals(
    "variant id matches",
    retrieved.variant.id,
    inventory.variant.id,
  );
  TestValidator.equals(
    "quantity delta is negative after retrieval",
    retrieved.quantity_delta,
    quantityDelta,
  );
  TestValidator.equals("reason preserved", retrieved.reason, inventory.reason);
  TestValidator.predicate(
    "creation timestamp present",
    retrieved.created_at !== undefined && retrieved.created_at !== null,
  );
}
