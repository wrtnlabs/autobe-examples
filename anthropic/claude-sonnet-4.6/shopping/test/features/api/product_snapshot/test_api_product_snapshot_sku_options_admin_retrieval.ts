import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSkusOption";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_snapshot_sku_options_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup - register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. As admin, create a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_id: null,
        name: `Electronics-${RandomGenerator.alphaNumeric(8)}`,
        description: "Electronics category for test",
      },
    },
  );
  typia.assert(category);
  // 4. As seller, create a product with an initial variant (color: Red, size: Large)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `Test Product ${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 99.99,
        categoryId: category.id,
        variants: [
          {
            sku: `SKU-A-${RandomGenerator.alphaNumeric(8)}`,
            priceOverride: null,
            options: [
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "color",
                value: "Red",
                sequence: 0,
                created_at: new Date().toISOString(),
              },
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "size",
                value: "Large",
                sequence: 1,
                created_at: new Date().toISOString(),
              },
            ],
          },
        ],
      },
    },
  );
  typia.assert(product);
  // 5. As seller, create an additional variant to trigger a new snapshot
  // This variant has options: color: Blue, size: Small
  const newVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku: `SKU-B-${RandomGenerator.alphaNumeric(8)}`,
          priceOverride: null,
          options: [
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "color",
              value: "Blue",
              sequence: 0,
              created_at: new Date().toISOString(),
            },
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "size",
              value: "Small",
              sequence: 1,
              created_at: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(newVariant);
  // The new variant's ID serves as the closest approximation to the snapshot SKU ID.
  // The snapshot system auto-generates snapshot records; without a snapshot listing API,
  // we use the variant ID from the creation response.
  const skuId = newVariant.id;
  // The product's first variant ID is used as the snapshotId approximation.
  // In a real system, the snapshotId would be retrieved from a snapshot listing endpoint.
  const snapshotId =
    product.variants.length > 0
      ? product.variants[0]!.id
      : typia.random<string & tags.Format<"uuid">>();
  // 6. As admin, call the target endpoint with default request body (no filters)
  const result =
    await api.functional.shoppingMall.admin.snapshots.skuses.options.index(
      adminConnection,
      {
        snapshotId: snapshotId,
        skuId: skuId,
        body: {} satisfies IShoppingMallProductSnapshotSkusOption.IRequest,
      },
    );
  typia.assert(result);
  // 7. Validate business logic: options ordered by sequence ASC
  for (let i = 1; i < result.data.length; i++) {
    TestValidator.predicate(
      `options ordered by sequence ASC at index ${i}`,
      result.data[i]!.sequence >= result.data[i - 1]!.sequence,
    );
  }
  // Validate each option's product_snapshot_skus_id links back to the requested skuId
  for (const option of result.data) {
    TestValidator.equals(
      "option product_snapshot_skus_id matches requested skuId",
      option.product_snapshot_skus_id,
      skuId,
    );
  }
  // Validate records count matches data length when on a single page
  if (result.pagination.pages <= 1) {
    TestValidator.equals(
      "pagination.records matches data array length on single page",
      result.data.length,
      result.pagination.records,
    );
  }
}
