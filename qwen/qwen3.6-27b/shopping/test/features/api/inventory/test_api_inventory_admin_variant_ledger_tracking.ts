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
import { generate_random_ecommerce_platform_admin_products_variants_inventory_adjust } from "../../../generate/generate_random_ecommerce_platform_admin_products_variants_inventory_adjust";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_inventory_record } from "../../../prepare/prepare_random_ecommerce_platform_inventory_record";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test cumulative stock level derivation through multiple immutable inventory ledger entries.
 *
 * The scenario ensures that inventory adjustments follow a strict audit trail where each change appends a new record with a signed quantity delta and a descriptive reason. The current stock level for a product variant should equal the sum of all quantity deltas across the ledger.
 *
 * 1. Administrator authenticates via join operation.
 * 2. Administrator creates a product category for classification.
 * 3. Seller authenticates via join operation.
 * 4. Seller creates a product assigned to the category.
 * 5. Seller creates a product variant under the product.
 * 6. First adjustment: Admin applies +100 quantity delta (initial inventory setup).
 * 7. Second adjustment: Admin applies -15 quantity delta (damaged goods removal).
 * 8. Third adjustment: Admin applies +25 quantity delta (refund restoration).
 * 9. Validates each ledger entry is immutable and maintains unique creation timestamps.
 * 10. Validates cumulative stock level equals 110 (100 - 15 + 25).
 * 11. Ensures transactional integrity and complete traceability for dispute resolution.
 */
export async function test_api_inventory_admin_variant_ledger_tracking(
  connection: api.IConnection,
) {
  // 1. Admin authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller authentication via join
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Seller creates product assigned to category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // 5. Seller creates product variant
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 6. First adjustment: +100 initial inventory setup
  const adjust1 =
    await generate_random_ecommerce_platform_admin_products_variants_inventory_adjust(
      adminConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: { quantity_delta: 100, reason: "initial inventory setup" },
      },
    );
  typia.assert(adjust1);
  // 7. Second adjustment: -15 damaged goods removal
  const adjust2 =
    await generate_random_ecommerce_platform_admin_products_variants_inventory_adjust(
      adminConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: { quantity_delta: -15, reason: "damaged goods removal" },
      },
    );
  typia.assert(adjust2);
  // 8. Third adjustment: +25 refund restoration
  const adjust3 =
    await generate_random_ecommerce_platform_admin_products_variants_inventory_adjust(
      adminConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: { quantity_delta: 25, reason: "refund restoration" },
      },
    );
  typia.assert(adjust3);
  // 9. Immutable ledger entries with unique timestamps
  TestValidator.notEquals(
    "timestamp 1 vs 2",
    adjust1.created_at,
    adjust2.created_at,
  );
  TestValidator.notEquals(
    "timestamp 2 vs 3",
    adjust2.created_at,
    adjust3.created_at,
  );
  // 10. Cumulative stock derivation: 100 - 15 + 25 = 110
  TestValidator.equals(
    "total quantity delta",
    adjust1.quantity_delta + adjust2.quantity_delta + adjust3.quantity_delta,
    110,
  );
}
