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
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
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
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_product_variant_snapshot_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create product category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // 3. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(sellerAuth);
  // 4. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Create product variant with options
  const originalSkuCode = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
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
          ],
        },
      },
    );
  typia.assert(variant);
  // 6. Update variant to trigger snapshot creation
  const updatedSkuCode = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const updatedPrice = originalPrice + 50;
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          skuCode: updatedSkuCode,
          price: updatedPrice,
          options: [
            { optionName: "Color", optionValue: "Blue" },
            { optionName: "Size", optionValue: "Small" },
          ],
        },
      },
    );
  typia.assert(updatedVariant);
  // 7. List snapshots to obtain the snapshot ID
  const snapshotList =
    await api.functional.ecommerceMall.seller.product_variants.snapshots.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {},
      },
    );
  typia.assert(snapshotList);
  // Validate at least one snapshot exists
  TestValidator.predicate(
    "snapshot list has at least one entry",
    snapshotList.data.length > 0,
  );
  const snapshotId = snapshotList.data[0].id;
  // 8. Retrieve specific snapshot
  const snapshot =
    await api.functional.ecommerceMall.seller.productVariants.snapshots.at(
      sellerConnection,
      {
        variantId: variant.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 9. Validate snapshot data
  TestValidator.equals("snapshot id matches", snapshot.id, snapshotId);
  TestValidator.equals(
    "product variant id matches",
    snapshot.productVariantId,
    variant.id,
  );
  TestValidator.equals(
    "snapshot sku code matches original",
    snapshot.skuCode,
    originalSkuCode,
  );
  TestValidator.equals(
    "snapshot price matches original",
    snapshot.price,
    originalPrice,
  );
  // Validate option values exist and contain original values
  TestValidator.predicate(
    "option values array is not empty",
    snapshot.optionValues.length > 0,
  );
  // Verify the snapshot captures the original option values (Red, Large)
  const colorOption = snapshot.optionValues.find(
    (opt) => opt.option_name === "Color",
  );
  const sizeOption = snapshot.optionValues.find(
    (opt) => opt.option_name === "Size",
  );
  TestValidator.equals(
    "color option value is original",
    colorOption?.option_value,
    "Red",
  );
  TestValidator.equals(
    "size option value is original",
    sizeOption?.option_value,
    "Large",
  );
}
