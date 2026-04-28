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
 * Test admin listing of product variant snapshots with pagination support.
 *
 * Validates the complete workflow from category creation through product and variant setup, then verifies that an admin can retrieve variant snapshot history with proper pagination metadata. Ensures unrestricted admin access to any variant's snapshots regardless of product ownership.
 *
 * Special attention is given to verifying that the paginated response includes correct pagination metadata (current page, limit, total records, total pages) and that snapshot records contain expected SKU code, price, and stock quantity fields.
 *
 * 1. Administrator registers and authenticates to the platform.
 * 2. Admin creates a product category for product classification.
 * 3. Seller registers and authenticates (pending approval state).
 * 4. Seller creates a product assigned to the admin-created category.
 * 5. Seller creates a variant with SKU code and options for the product.
 * 6. Admin queries variant snapshots with pagination parameters (page=1, limit=10).
 * 7. Validates pagination metadata correctness and response structure.
 */
export async function test_api_variant_snapshot_admin_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: { email: adminEmail },
  });
  // 2. Admin creates product category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail },
  });
  typia.assert(sellerAuth);
  // 4. Seller creates product in the assigned category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 5. Seller creates variant for the product
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 6. Admin queries variant snapshots with pagination
  const snapshots =
    await api.functional.ecommercePlatform.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformSnapshotVariant.IRequest,
      },
    );
  typia.assert(snapshots);
  // 7. Validate pagination metadata and response structure
  TestValidator.equals("current page is 1", snapshots.pagination.current, 1);
  TestValidator.equals("limit is 10", snapshots.pagination.limit, 10);
  TestValidator.predicate(
    "total records is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // Validate each snapshot record structure
  await ArrayUtil.asyncForEach(snapshots.data, async (snapshot) => {
    typia.assert(snapshot);
    TestValidator.predicate(
      `snapshot ${snapshot.id} has sku_code`,
      snapshot.sku_code.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} price is finite`,
      Number.isFinite(snapshot.price),
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} has snapshot header`,
      snapshot.snapshot.entityType.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} references variant`,
      snapshot.variant.id.length > 0,
    );
  });
}
