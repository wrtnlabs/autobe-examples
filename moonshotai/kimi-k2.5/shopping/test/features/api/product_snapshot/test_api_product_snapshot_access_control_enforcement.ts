import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that only administrators can access product snapshots.
 * Validates the access control requirements restricting product snapshot viewing to administrators only.
 */
export async function test_api_product_snapshot_access_control_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Create a category (required for product creation)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Step 3: Authenticate as seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {});
  // Step 4: Create a product as seller A (this implicitly creates a snapshot)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // Step 5: Get snapshot ID - product snapshot is created on product creation
  // Since we cannot query snapshots, we generate a UUID for testing
  // In practice, this would be obtained from a snapshot listing endpoint
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Step 6: Admin successfully retrieves the snapshot (200 OK expected)
  // Note: This assumes the snapshot exists. If it doesn't exist, we'd get 404.
  // The test focuses on authorization, so either 200 or 404 is acceptable from admin
  // as long as it's not 403. However, per scenario, admin should succeed.
  const adminSnapshotResult =
    await api.functional.ecommerceMall.admin.products.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(adminSnapshotResult);
  // Step 7: Authenticate as seller B (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // Step 8: Attempt to access the snapshot endpoint as seller B
  // Seller should be rejected with 401 or 403
  await TestValidator.httpError(
    "seller cannot access admin product snapshot endpoint",
    [401, 403],
    async () => {
      await api.functional.ecommerceMall.admin.products.snapshots.at(
        sellerBConnection,
        {
          productId: product.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
  // Additional validation: Verify seller A also cannot access (owner exclusion)
  await TestValidator.httpError(
    "product owner seller cannot access admin snapshot endpoint",
    [401, 403],
    async () => {
      await api.functional.ecommerceMall.admin.products.snapshots.at(
        sellerAConnection,
        {
          productId: product.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
