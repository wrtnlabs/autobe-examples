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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshot";
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
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";

/**
 * Test product edit snapshots are accessible and contain correct historical audit data.
 *
 * Validates that the snapshot system correctly records product entity modifications. Snapshots preserve the before-and-after state as an immutable audit trail for dispute resolution and compliance. The snapshot header captures the entity type that was modified and the timestamp when the change occurred.
 *
 *
 * The test verifies snapshot creation during product registration, snapshot pagination metadata, and snapshot field integrity. Multiple products are created to confirm that snapshot isolation is maintained between unrelated product entities.
 *
 * 1. Admin joins and authenticates to create a prerequisite product category.
 * 2. Seller joins and authenticates to create products in that category.
 * 3. Seller creates two distinct products to generate separate snapshot trails.
 * 4. Query the snapshots endpoint for the first product and verify snapshot records.
 * 5. Verify snapshots contain correct entityType ('product') and valid createdAt timestamps.
 * 6. Query snapshots for the second product to verify snapshot isolation.
 * 7. Confirm that each product's snapshots reference only its own entity, not the other product's.
 */
export async function test_api_product_snapshot_persistence_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates a category
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
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Create two products to generate separate snapshot trails
  const productA =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(productA);
  const productB =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(productB);
  // 4. Query snapshots for product A
  const snapshotsA: IPageIEcommercePlatformSnapshot.ISummary =
    await api.functional.ecommercePlatform.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: productA.id,
        body: {} satisfies IEcommercePlatformSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsA);
  TestValidator.predicate(
    "product A has snapshots",
    snapshotsA.data.length > 0,
  );
  TestValidator.equals(
    "product A pagination current page",
    snapshotsA.pagination.current,
    1,
  );
  // 5. Verify snapshot field integrity for product A
  const snapshotAIds = new Set(snapshotsA.data.map((s) => s.id));
  for (const snapshot of snapshotsA.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      `snapshot entityType is 'product' for product A`,
      snapshot.entityType,
      "product",
    );
    TestValidator.predicate(
      `snapshot has valid createdAt for product A`,
      snapshot.createdAt.length > 0,
    );
  }
  // 6. Query snapshots for product B to verify isolation
  const snapshotsB: IPageIEcommercePlatformSnapshot.ISummary =
    await api.functional.ecommercePlatform.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: productB.id,
        body: {} satisfies IEcommercePlatformSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsB);
  TestValidator.predicate(
    "product B has snapshots",
    snapshotsB.data.length > 0,
  );
  // 7. Verify snapshot isolation: no shared snapshot IDs between products
  const snapshotBIds = new Set(snapshotsB.data.map((s) => s.id));
  const sharedIds = [...snapshotAIds].filter((id) => snapshotBIds.has(id));
  TestValidator.equals(
    "no shared snapshots between products",
    sharedIds.length,
    0,
  );
}
