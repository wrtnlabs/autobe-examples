import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
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

/**
 * Test that an administrator can successfully retrieve a specific product variant snapshot by its ID for oversight and audit purposes.
 *
 * This test validates the snapshot viewing functionality for administrators, ensuring they can access
 * historical variant data for audit trails and dispute resolution. The test creates a complete workflow:
 * admin authentication, category creation, seller authentication, product creation, variant creation,
 * variant editing (to trigger snapshot), listing snapshots, and finally retrieving a specific snapshot.
 *
 * @param connection Base connection to the API
 */
export async function test_api_admin_variant_snapshot_viewing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create a category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 4. Create a product as seller using the created category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Create a variant for the product
  const originalSkuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const originalPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100>
  >();
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: originalSkuCode,
          price: originalPrice,
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        },
      },
    );
  typia.assert(variant);
  // 6. Edit the variant to trigger snapshot creation
  const updatedSkuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const updatedPrice = originalPrice + 100;
  await api.functional.ecommerceMall.seller.products.variants.update(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      body: {
        skuCode: updatedSkuCode,
        price: updatedPrice,
        optionValues: [
          { optionName: "Color", optionValue: "Blue" },
          { optionName: "Size", optionValue: "Medium" },
        ] satisfies IEcommerceMallProductVariantOption.ICreate[],
      } satisfies IEcommerceMallProductVariant.IUpdate,
    },
  );
  // 7. List variant snapshots to get the snapshotId
  const snapshotsResponse =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {} satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // Verify at least one snapshot exists
  TestValidator.predicate("snapshots exist", snapshotsResponse.data.length > 0);
  const snapshotId = snapshotsResponse.data[0].id;
  // 8. Retrieve the specific snapshot using the admin endpoint
  const snapshot =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 9. Validate snapshot data represents state BEFORE the edit
  TestValidator.equals(
    "snapshot productVariantId matches variant",
    snapshot.productVariantId,
    variant.id,
  );
  TestValidator.equals(
    "snapshot skuCode is original value",
    snapshot.skuCode,
    originalSkuCode,
  );
  TestValidator.equals(
    "snapshot price is original value",
    snapshot.price,
    originalPrice,
  );
  TestValidator.predicate(
    "snapshot has optionValues",
    snapshot.optionValues.length > 0,
  );
  TestValidator.predicate(
    "snapshot createdAt is valid",
    typeof snapshot.createdAt === "string",
  );
  // Validate option values are preserved
  const colorOption = snapshot.optionValues.find(
    (ov) => ov.optionName === "Color",
  );
  TestValidator.equals(
    "color option value preserved",
    colorOption?.optionValue,
    "Red",
  );
  const sizeOption = snapshot.optionValues.find(
    (ov) => ov.optionName === "Size",
  );
  TestValidator.equals(
    "size option value preserved",
    sizeOption?.optionValue,
    "Large",
  );
}
