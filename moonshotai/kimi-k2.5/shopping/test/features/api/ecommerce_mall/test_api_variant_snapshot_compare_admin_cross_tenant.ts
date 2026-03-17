import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_variant_snapshot_compare_admin_cross_tenant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller and admin accounts
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(seller);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(admin);
  // 2. Admin creates a category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller creates a product under the category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a variant with initial values (SKU, options, price 50)
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: "SKU-001",
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Small" },
          ],
          price: 50,
          stock: 10,
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 5. Edit variant to create first snapshot (price change from 50 to 60)
  const updatedVariant1 =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: 60,
        },
      },
    );
  typia.assert(updatedVariant1);
  // 6. Edit variant again to create second snapshot (option change Size from Small to Large)
  const updatedVariant2 =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          optionValues: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ],
        },
      },
    );
  typia.assert(updatedVariant2);
  // 7. Retrieve snapshots to get IDs for comparison
  const snapshots =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {},
      },
    );
  typia.assert(snapshots);
  // Ensure we have at least 2 snapshots
  TestValidator.predicate(
    "at least 2 snapshots exist",
    snapshots.data.length >= 2,
  );
  const firstSnapshot = snapshots.data[0];
  const secondSnapshot = snapshots.data[1];
  typia.assertGuard(firstSnapshot);
  typia.assertGuard(secondSnapshot);
  // 8. Admin calls compare endpoint with both snapshot IDs (cross-tenant access)
  const comparison: IEcommerceMallProductVariantSnapshot.ISnapshotCompare =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.compare.compareSnapshots(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId: firstSnapshot.id,
        otherSnapshotId: secondSnapshot.id,
      },
    );
  typia.assert(comparison);
  // 9. Verify response shows proper field comparisons
  TestValidator.equals(
    "comparison includes first snapshot ID",
    comparison.snapshotId,
    firstSnapshot.id,
  );
  TestValidator.equals(
    "comparison includes second snapshot ID",
    comparison.otherSnapshotId,
    secondSnapshot.id,
  );
  TestValidator.predicate(
    "comparison has differences",
    comparison.differences.length > 0,
  );
  // Verify price change difference is present
  const priceDifference = comparison.differences.find(
    (diff) => diff.fieldName === "price",
  );
  TestValidator.predicate(
    "price difference exists",
    priceDifference !== undefined,
  );
  // Verify Size option change is present
  const sizeDifference = comparison.differences.find(
    (diff) => diff.fieldName === "Size",
  );
  TestValidator.predicate(
    "Size option difference exists",
    sizeDifference !== undefined,
  );
  // 10. Confirm no access errors - admin successfully compared snapshots they don't own
  TestValidator.equals(
    "snapshot created at for first snapshot matches",
    comparison.snapshotCreatedAt,
    firstSnapshot.createdAt,
  );
  TestValidator.equals(
    "snapshot created at for second snapshot matches",
    comparison.otherSnapshotCreatedAt,
    secondSnapshot.createdAt,
  );
}
