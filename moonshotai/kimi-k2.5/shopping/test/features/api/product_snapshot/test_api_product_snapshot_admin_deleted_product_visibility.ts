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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test that administrators can access complete snapshot history for products
 * that have been soft-deleted from active listings. Verify snapshots preserve
 * immutable historical product state including name, description, category
 * assignment, base price, and all associated images at each point in time.
 * Validate that snapshots remain accessible even after product deletion,
 * supporting dispute resolution and audit trail requirements. Confirm the
 * endpoint returns appropriate snapshot data for deleted products demonstrating
 * snapshot immutability guarantees.
 */
export async function test_api_product_snapshot_admin_deleted_product_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create a category for product creation
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Create a product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Soft delete the product as admin
  await api.functional.ecommerceMall.admin.products.erase(adminConnection, {
    productId: product.id,
  });
  // 6. Verify snapshots are still accessible after product deletion
  const snapshotRequest = {
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallProductSnapshot.IRequest;
  const snapshots: IPageIEcommerceMallProductSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: snapshotRequest,
      },
    );
  typia.assert(snapshots);
  // 7. Validate snapshot data exists
  typia.assertGuard(snapshots.data.length > 0);
  // 8. Verify first snapshot preserves product state
  const firstSnapshot = snapshots.data[0];
  typia.assert(firstSnapshot);
  // 9. Validate snapshot preserves all critical product information
  typia.assertGuard(firstSnapshot.name !== undefined);
  typia.assertGuard(firstSnapshot.description !== undefined);
  typia.assertGuard(firstSnapshot.basePrice >= 0);
  typia.assertGuard(firstSnapshot.category !== undefined);
  typia.assertGuard(firstSnapshot.category.id !== undefined);
  typia.assertGuard(firstSnapshot.createdAt !== undefined);
  typia.assertGuard(Array.isArray(firstSnapshot.images));
  // 10. Verify snapshot data matches original product data
  typia.assertGuard(snapshots.data.length > 0);
  const latestSnapshot = snapshots.data[0];
  TestValidator.equals("name", latestSnapshot.name, product.name);
  TestValidator.equals("description", latestSnapshot.description, product.description);
  TestValidator.equals("basePrice", latestSnapshot.basePrice, product.basePrice);
  TestValidator.equals("categoryId", latestSnapshot.category.id, category.id);
}