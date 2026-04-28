import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotVariant";
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
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test admin filtering variant snapshots by SKU code.
 *
 * Validates the complete product variant snapshot filtering workflow. An administrator creates a product category, a seller creates a product and variant with a known SKU code, and then the admin queries variant snapshots using the sku_code filter parameter. Ensures that only snapshots matching the exact SKU code are returned, and that snapshots with non-matching SKU codes are excluded.
 *
 * 1. Administrator registers and authenticates to the platform.
 * 2. Admin creates a product category.
 * 3. Seller registers and authenticates.
 * 4. Seller creates a product assigned to the category.
 * 5. Seller creates a variant with a known unique SKU code.
 * 6. Admin queries variant snapshots with sku_code filter matching the variant's SKU.
 * 7. Validates that all returned snapshots have the matching SKU code.
 * 8. Verifies that querying with a non-matching SKU code returns zero results.
 */
export async function test_api_variant_snapshot_admin_filter_sku_code(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a product category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Seller creates a product assigned to the category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 5. Seller creates a variant with a known unique SKU code
  const knownSkuCode = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { skuCode: knownSkuCode },
      },
    );
  typia.assert(variant);
  // 6. Admin queries variant snapshots with sku_code filter matching the variant's SKU
  const filteredResponse =
    await api.functional.ecommercePlatform.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: knownSkuCode,
        } satisfies IEcommercePlatformSnapshotVariant.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 7. Validate all returned snapshots match the SKU code filter
  TestValidator.predicate(
    "snapshots with matching sku_code exist",
    filteredResponse.data.length > 0,
  );
  for (const snapshot of filteredResponse.data) {
    TestValidator.equals(
      `snapshot sku_code matches filter "${knownSkuCode}"`,
      snapshot.sku_code,
      knownSkuCode,
    );
  }
  // 8. Verify non-matching sku_code returns zero results
  const nonMatchingSkuCode = `SKU-NO-MATCH-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const emptyResponse =
    await api.functional.ecommercePlatform.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: nonMatchingSkuCode,
        } satisfies IEcommercePlatformSnapshotVariant.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "non-matching sku_code returns no snapshots",
    emptyResponse.data.length,
    0,
  );
}
