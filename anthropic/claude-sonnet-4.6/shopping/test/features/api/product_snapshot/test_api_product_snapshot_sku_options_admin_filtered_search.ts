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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_snapshot_sku_options_admin_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // ── 1. Admin registration ──────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ── 2. Seller registration ─────────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // ── 3. Admin creates category ──────────────────────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Apparel-" + RandomGenerator.alphabets(6),
        description: "Clothing category for testing",
      },
    },
  );
  typia.assert(category);
  // ── 4. Seller creates product with multiple distinguishable variant options ─
  const variantSku = "SKU-" + RandomGenerator.alphaNumeric(10);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product " + RandomGenerator.alphabets(5),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 9999,
        categoryId: category.id,
        variants: [
          {
            sku: variantSku,
            priceOverride: null,
            options: [
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "color",
                value: "Crimson Red",
                sequence: 0 as number & tags.Type<"int32">,
                created_at: new Date().toISOString(),
              },
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "size",
                value: "Extra Large",
                sequence: 1 as number & tags.Type<"int32">,
                created_at: new Date().toISOString(),
              },
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "material",
                value: "Cotton",
                sequence: 2 as number & tags.Type<"int32">,
                created_at: new Date().toISOString(),
              },
            ],
          },
        ],
      },
    },
  );
  typia.assert(product);
  // ── 5. Extract variant id (closest proxy to snapshot sku id) ───────────────
  // NOTE: IShoppingMallProduct does not expose snapshot IDs directly.
  // The product snapshot is auto-generated at creation time.
  // We use the first variant's id as the skuId proxy.
  // In a real environment, a snapshot listing endpoint would provide snapshotId.
  const variant = product.variants[0];
  typia.assertGuard(variant!);
  const skuId = variant.id;
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // ── 6. Filter by partial key "col" (matches 'color') ──────────────────────
  const filteredByKey =
    await api.functional.shoppingMall.admin.snapshots.skuses.options.index(
      adminConnection,
      {
        snapshotId: snapshotId,
        skuId: skuId,
        body: {
          key: "col",
        },
      },
    );
  typia.assert(filteredByKey);
  // ── 7. Filter by partial value "Large" (matches 'Extra Large') ────────────
  const filteredByValue =
    await api.functional.shoppingMall.admin.snapshots.skuses.options.index(
      adminConnection,
      {
        snapshotId: snapshotId,
        skuId: skuId,
        body: {
          value: "Large",
        },
      },
    );
  typia.assert(filteredByValue);
  // ── 8. Combined filter: key "mat" + value "Cotton" ────────────────────────
  const filteredByCombined =
    await api.functional.shoppingMall.admin.snapshots.skuses.options.index(
      adminConnection,
      {
        snapshotId: snapshotId,
        skuId: skuId,
        body: {
          key: "mat",
          value: "Cotton",
        },
      },
    );
  typia.assert(filteredByCombined);
  // ── 9. No-match filter ─────────────────────────────────────────────────────
  const filteredNoMatch =
    await api.functional.shoppingMall.admin.snapshots.skuses.options.index(
      adminConnection,
      {
        snapshotId: snapshotId,
        skuId: skuId,
        body: {
          key: "nonexistent",
        },
      },
    );
  typia.assert(filteredNoMatch);
  // ── 10. Validate filter by partial key ────────────────────────────────────
  TestValidator.predicate(
    "filter by 'col' returns 1 record",
    filteredByKey.pagination.records === 1,
  );
  TestValidator.predicate(
    "filter by 'col' returns color option",
    filteredByKey.data.length === 1 && filteredByKey.data[0]!.key === "color",
  );
  TestValidator.predicate(
    "color option product_snapshot_skus_id matches skuId",
    filteredByKey.data[0]!.product_snapshot_skus_id === skuId,
  );
  // ── 11. Validate filter by partial value ──────────────────────────────────
  TestValidator.predicate(
    "filter by 'Large' returns 1 record",
    filteredByValue.pagination.records === 1,
  );
  TestValidator.predicate(
    "filter by 'Large' returns size option with value 'Extra Large'",
    filteredByValue.data.length === 1 &&
      filteredByValue.data[0]!.value === "Extra Large",
  );
  // ── 12. Validate combined filter ──────────────────────────────────────────
  TestValidator.predicate(
    "combined filter returns 1 record",
    filteredByCombined.pagination.records === 1,
  );
  TestValidator.predicate(
    "combined filter returns material option with value Cotton",
    filteredByCombined.data.length === 1 &&
      filteredByCombined.data[0]!.key === "material" &&
      filteredByCombined.data[0]!.value === "Cotton",
  );
  // ── 13. Validate no-match filter ──────────────────────────────────────────
  TestValidator.predicate(
    "nonexistent key returns 0 records",
    filteredNoMatch.pagination.records === 0,
  );
  TestValidator.predicate(
    "nonexistent key returns empty data array",
    filteredNoMatch.data.length === 0,
  );
}
