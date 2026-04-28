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
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
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
 * Test negative inventory adjustment for damaged or lost products.
 *
 * Validates that sellers can record negative stock adjustments to account for inventory losses such as damaged goods. The system creates an immutable inventory ledger entry with a negative quantity_delta and a descriptive business reason. This action reduces the computed current stock for the product variant, maintaining accurate stock levels and preventing overselling.
 *
 * Important business rules are verified: positive stock must exist before negative adjustments to prevent negative stock states. The computed stock_quantity reflects the running sum of all inventory ledger entries for the variant, ensuring an accurate audit trail.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and authenticates to the platform.
 * 3. Seller creates a product listing in the category.
 * 4. Seller creates a product variant with unique SKU and options.
 * 5. Seller adds positive stock to establish baseline inventory.
 * 6. Seller records a negative stock adjustment for damaged products.
 * 7. Validates the inventory record has correct negative delta, reason, and variant reference, and that stock decreased appropriately.
 */
export async function test_api_seller_inventory_adjust_negative_loss(
  connection: api.IConnection,
) {
  // 1. Admin joins platform and creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller joins and logs in using dedicated connection
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {});
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "1234",
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/dashboard",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 3. Seller creates product in the category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 4. Seller creates product variant (stock initialized at 0)
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { body: undefined, params: { productId: product.id } },
    );
  typia.assert(variant);
  // 5. Add positive stock first to establish baseline
  const positiveStock =
    await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
      sellerConnection,
      {
        body: { quantity_delta: 100 },
        params: { productId: product.id, variantId: variant.id },
      },
    );
  typia.assert(positiveStock);
  // 6. Record negative inventory adjustment for damaged products
  const negativeAdjustment =
    await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
      sellerConnection,
      {
        body: {
          quantity_delta: -25,
          reason: "Damaged items found during quality inspection",
        },
        params: { productId: product.id, variantId: variant.id },
      },
    );
  typia.assert(negativeAdjustment);
  // 7. Validate negative inventory record
  TestValidator.equals(
    "negative adjustment quantity delta",
    negativeAdjustment.quantity_delta,
    -25,
  );
  TestValidator.equals(
    "adjustment reason matches input",
    negativeAdjustment.reason,
    "Damaged items found during quality inspection",
  );
  TestValidator.equals(
    "variant reference matches target",
    negativeAdjustment.variant.id,
    variant.id,
  );
  TestValidator.predicate(
    "stock decreased after negative adjustment",
    negativeAdjustment.variant.stock_quantity <
      positiveStock.variant.stock_quantity,
  );
}
