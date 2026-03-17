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
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IFieldComparison } from "@ORGANIZATION/PROJECT-api/lib/structures/IFieldComparison";
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
 * Test administrator attempts to compare snapshots for non-existent product or invalid snapshot IDs.
 *
 * Prerequisites:
 * 1. Create admin and seller accounts
 * 2. Create category
 * 3. Create product and update to create snapshots
 *
 * Test cases:
 * 1. Non-existent productId returns 404
 * 2. Valid productId but non-existent snapshotId returns 404
 * 3. Seller (non-admin) accessing admin endpoint gets 403 Forbidden
 */
export async function test_api_product_snapshot_comparison_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 5. Update product to create snapshots
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: "Updated Product Name",
          description: "Updated description",
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // Generate random UUIDs for non-existent entities
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentOtherSnapshotId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test 1: Non-existent productId returns 404
  await TestValidator.httpError(
    "non-existent productId should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.products.snapshots.compare(
        adminConnection,
        {
          productId: nonExistentProductId,
          snapshotId: nonExistentSnapshotId,
          otherSnapshotId: nonExistentOtherSnapshotId,
        },
      );
    },
  );
  // Test 2: Valid productId but non-existent snapshotId returns 404
  await TestValidator.httpError(
    "non-existent snapshotId should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.products.snapshots.compare(
        adminConnection,
        {
          productId: product.id,
          snapshotId: nonExistentSnapshotId,
          otherSnapshotId: nonExistentOtherSnapshotId,
        },
      );
    },
  );
  // Test 3: Seller (non-admin) accessing admin endpoint gets 403 Forbidden
  await TestValidator.httpError(
    "seller accessing admin endpoint should get 403 Forbidden",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.products.snapshots.compare(
        sellerConnection,
        {
          productId: product.id,
          snapshotId: nonExistentSnapshotId,
          otherSnapshotId: nonExistentOtherSnapshotId,
        },
      );
    },
  );
}
