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

export async function test_api_product_snapshot_comparison_identical_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!@#";
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "",
      referrer: "",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "Seller123!@#";
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "",
      referrer: "",
      ip: "",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Test Category",
        description: "Test category for product snapshot comparison",
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 4. Create product as seller (first version)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "Test product for snapshot comparison",
        categoryId: category.id,
        basePrice: 10000,
        images: [],
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. For identical snapshot comparison, we compare the same snapshot with itself
  // This tests the edge case where before and after are identical
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 6. Compare the snapshot with itself (identical snapshots test)
  const comparison =
    await api.functional.ecommerceMall.admin.products.snapshots.compare(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        otherSnapshotId: snapshotId,
      },
    );
  typia.assert(comparison);
  // 7. Validate response structure for identical snapshots
  TestValidator.predicate(
    "comparison has beforeSnapshotId",
    comparison.beforeSnapshotId !== undefined,
  );
  TestValidator.predicate(
    "comparison has afterSnapshotId",
    comparison.afterSnapshotId !== undefined,
  );
  TestValidator.predicate(
    "comparison has beforeSnapshotCreatedAt",
    comparison.beforeSnapshotCreatedAt !== undefined,
  );
  TestValidator.predicate(
    "comparison has afterSnapshotCreatedAt",
    comparison.afterSnapshotCreatedAt !== undefined,
  );
  // 8. Verify fieldDiff exists and all fields have changed=false
  if (comparison.fieldDiff) {
    TestValidator.predicate(
      "name field exists and is not changed",
      comparison.fieldDiff.name?.changed === false,
    );
    TestValidator.predicate(
      "description field exists and is not changed",
      comparison.fieldDiff.description?.changed === false,
    );
    TestValidator.predicate(
      "basePrice field exists and is not changed",
      comparison.fieldDiff.basePrice?.changed === false,
    );
    TestValidator.predicate(
      "categoryId field exists and is not changed",
      comparison.fieldDiff.categoryId?.changed === false,
    );
  }
  // 9. Verify images comparison - all should be in unchanged array
  if (comparison.images) {
    TestValidator.predicate(
      "images added array is empty",
      comparison.images.added.length === 0,
    );
    TestValidator.predicate(
      "images removed array is empty",
      comparison.images.removed.length === 0,
    );
    TestValidator.predicate(
      "images reordered array is empty",
      comparison.images.reordered.length === 0,
    );
  }
  // 10. Verify variants comparison - all should be in unchanged array
  if (comparison.variants) {
    TestValidator.predicate(
      "variants added array is empty",
      comparison.variants.added.length === 0,
    );
    TestValidator.predicate(
      "variants removed array is empty",
      comparison.variants.removed.length === 0,
    );
    TestValidator.predicate(
      "variants modified array is empty",
      comparison.variants.modified.length === 0,
    );
  }
}