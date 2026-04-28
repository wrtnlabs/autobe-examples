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
import { generate_random_ecommerce_platform_seller_products_variants_inventory_adjust } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_inventory_adjust";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_inventory_record } from "../../../prepare/prepare_random_ecommerce_platform_inventory_record";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test inventory loss adjustment workflow using negative quantity delta.
 *
 * Validates the complete inventory adjustment flow including administrative category setup, seller authentication, product and variant creation, positive restock, and negative loss adjustment. Ensures that inventory adjustments follow an immutable ledger pattern where stock changes are recorded as append-only entries with signed quantity deltas.
 *
 * Special attention is given to verifying that negative quantity deltas for loss adjustments are properly persisted with their business context reason, and that the returned inventory record correctly references the target variant.
 *
 * 1. Administrator joins and authenticates to create a product category.
 * 2. Seller joins and authenticates for product variant inventory operations.
 * 3. Product category is created for product assignment.
 * 4. Seller creates a product assigned to the category.
 * 5. Seller creates a product variant for the product.
 * 6. Seller restocks the variant with a positive inventory delta.
 * 7. Seller adjusts inventory with a negative delta representing stock loss.
 * 8. Validates the loss adjustment record contains correct negative delta and reason.
 */
export async function test_api_product_variant_inventory_loss_adjustment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates product with category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 5. Seller restocks variant with positive delta (establishes positive stock)
  const initialRestockQuantity = 50;
  const restockAdjustment =
    await generate_random_ecommerce_platform_seller_products_variants_inventory_adjust(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_delta: initialRestockQuantity,
          reason: "Initial stock restock - warehouse delivery",
        },
      },
    );
  typia.assert(restockAdjustment);
  // 6. Seller reports inventory loss with negative delta
  const lossQuantity = -20;
  const lossReason = "Damaged goods - warehouse accident";
  const lossAdjustment =
    await generate_random_ecommerce_platform_seller_products_variants_inventory_adjust(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_delta: lossQuantity,
          reason: lossReason,
        },
      },
    );
  typia.assert(lossAdjustment);
  // 7. Validate loss adjustment record
  TestValidator.equals(
    "quantity_delta is negative",
    lossAdjustment.quantity_delta,
    lossQuantity,
  );
  TestValidator.equals("reason preserved", lossAdjustment.reason, lossReason);
  TestValidator.equals(
    "variant reference matches",
    lossAdjustment.variant.id,
    variant.id,
  );
  TestValidator.predicate(
    "record has valid ID",
    lossAdjustment.id !== undefined,
  );
  TestValidator.predicate(
    "record has creation timestamp",
    lossAdjustment.created_at !== undefined,
  );
}
