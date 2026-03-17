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

export async function test_api_variant_snapshot_admin_comparison_single_field_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!",
    },
  });
  typia.assert(admin);
  // 2. Create and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller123!",
    },
  });
  typia.assert(seller);
  // 3. Admin approves seller
  await api.functional.ecommerceMall.admin.sellers.status.updateStatus(
    adminConnection,
    {
      sellerId: seller.id,
      body: {
        approvalStatus: "approved",
      } satisfies IEcommerceMallSeller.IUpdateStatus,
    },
  );
  // 4. Create category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: typia.random<string>(),
        description: "Test category for variant snapshot comparison",
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 5. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product for Variant Snapshots",
        description: "Product to test variant snapshot comparison",
        categoryId: category.id,
        basePrice: 100,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Create variant with initial configuration
  const initialPrice = 100;
  const initialSku = "SKU-TEST-001";
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: initialSku,
          price: initialPrice,
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            },
            {
              optionName: "Size",
              optionValue: "Large",
            },
          ],
          stock: 50,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 7. First edit to create first snapshot
  const firstUpdate =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: initialSku,
          price: initialPrice,
          optionValues: [
            {
              optionName: "Color",
              optionValue: "Red",
            },
            {
              optionName: "Size",
              optionValue: "Large",
            },
          ],
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  // 8. Second edit to create second snapshot with only price changed
  const newPrice = 150;
  const secondUpdate =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: newPrice,
          skuCode: initialSku,
          optionValues: [
            {
              optionName: "Color",
              optionValue: "Red",
            },
            {
              optionName: "Size",
              optionValue: "Large",
            },
          ],
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // Snapshot IDs would be obtained from the system after updates create them
  // For this test, we assume they are available (in real implementation, these would
  // be returned by the update operations or fetched via a list snapshots endpoint)
  const snapshotId1 = typia.random<string & tags.Format<"uuid">>();
  const snapshotId2 = typia.random<string & tags.Format<"uuid">>();
  // 9. Admin compares the two snapshots
  const comparison: IEcommerceMallProductVariantSnapshot.ISnapshotCompare =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.compare.compareSnapshots(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId: snapshotId1,
        otherSnapshotId: snapshotId2,
      },
    );
  typia.assert(comparison);
  // 10. Verify comparison results
  // Should have exactly one difference (price)
  TestValidator.equals("differences count", comparison.differences.length, 1);
  // Verify the difference is for price
  const priceDifference = comparison.differences.find(
    (diff: IEcommerceMallProductVariantSnapshot.ISnapshotFieldDifference) =>
      diff.fieldName === "price",
  );
  TestValidator.predicate(
    "price difference exists",
    priceDifference !== undefined,
  );
  if (priceDifference) {
    TestValidator.equals(
      "price old value",
      priceDifference.oldValue,
      String(initialPrice),
    );
    TestValidator.equals(
      "price new value",
      priceDifference.newValue,
      String(newPrice),
    );
  }
  // Verify SKU did not change (should not be in differences)
  const skuDifference = comparison.differences.find(
    (diff: IEcommerceMallProductVariantSnapshot.ISnapshotFieldDifference) =>
      diff.fieldName === "sku_code" || diff.fieldName === "skuCode",
  );
  TestValidator.equals("sku should not have changed", skuDifference, undefined);
  // Verify options did not change (should not be in differences)
  const colorDifference = comparison.differences.find(
    (diff: IEcommerceMallProductVariantSnapshot.ISnapshotFieldDifference) =>
      diff.fieldName === "Color",
  );
  const sizeDifference = comparison.differences.find(
    (diff: IEcommerceMallProductVariantSnapshot.ISnapshotFieldDifference) =>
      diff.fieldName === "Size",
  );
  TestValidator.equals(
    "color option should not have changed",
    colorDifference,
    undefined,
  );
  TestValidator.equals(
    "size option should not have changed",
    sizeDifference,
    undefined,
  );
}
