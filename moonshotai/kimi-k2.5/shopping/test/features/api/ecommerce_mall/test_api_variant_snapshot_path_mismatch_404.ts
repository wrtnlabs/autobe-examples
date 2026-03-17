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

export async function test_api_variant_snapshot_path_mismatch_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create category (admin operation)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(sellerAuth);
  // 4. Create first product
  const firstProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(firstProduct);
  // 5. Create first variant
  const firstVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: firstProduct.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            },
          ],
        },
      },
    );
  typia.assert(firstVariant);
  // 6. Update first variant to create a snapshot
  const updatedFirstVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: firstProduct.id,
        variantId: firstVariant.id,
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        },
      },
    );
  typia.assert(updatedFirstVariant);
  // 7. Get first variant's snapshotId
  const firstSnapshots =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: firstProduct.id,
        variantId: firstVariant.id,
        body: {},
      },
    );
  typia.assert(firstSnapshots);
  TestValidator.predicate(
    "first variant has snapshots",
    firstSnapshots.data.length > 0,
  );
  const firstSnapshotId = firstSnapshots.data[0].id;
  // 8. Create second product
  const secondProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(secondProduct);
  // 9. Create second variant
  const secondVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: secondProduct.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          options: [
            {
              optionName: "Size",
              optionValue: "Large",
            },
          ],
        },
      },
    );
  typia.assert(secondVariant);
  // 10. Update second variant to create a snapshot
  const updatedSecondVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: secondProduct.id,
        variantId: secondVariant.id,
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        },
      },
    );
  typia.assert(updatedSecondVariant);
  // 11. Test: Access first snapshot with mismatched productId (second product's id)
  // Should return 404 to prevent information leakage
  await TestValidator.error(
    "should return 404 when productId in path doesn't match snapshot's actual product",
    async () => {
      await api.functional.ecommerceMall.admin.products.variants.snapshots.at(
        adminConnection,
        {
          productId: secondProduct.id, // Wrong productId
          variantId: firstVariant.id,
          snapshotId: firstSnapshotId,
        },
      );
    },
  );
  // 12. Test: Access first snapshot with mismatched variantId (second variant's id)
  // Should return 404 to prevent information leakage
  await TestValidator.error(
    "should return 404 when variantId in path doesn't match snapshot's actual variant",
    async () => {
      await api.functional.ecommerceMall.admin.products.variants.snapshots.at(
        adminConnection,
        {
          productId: firstProduct.id,
          variantId: secondVariant.id, // Wrong variantId
          snapshotId: firstSnapshotId,
        },
      );
    },
  );
}
