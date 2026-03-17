import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSkus";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
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

export async function test_api_product_snapshot_sku_seller_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Electronics",
      },
    },
  );
  typia.assert(category);
  // 3. Authenticate as a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create a product with an inline variant (color: Red, size: M)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        name: "Test Product " + RandomGenerator.alphaNumeric(6),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: 10000,
        variants: [
          {
            sku: "SKU-RED-M-" + RandomGenerator.alphaNumeric(8),
            priceOverride: null,
            options: [
              {
                key: "color",
                value: "Red",
                sequence: 0,
              },
              {
                key: "size",
                value: "M",
                sequence: 1,
              },
            ],
          },
        ],
      },
    },
  );
  typia.assert(product);
  // 5. Add another variant (color: Blue, size: L) to trigger a second snapshot
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: "SKU-BLUE-L-" + RandomGenerator.alphaNumeric(8),
          priceOverride: null,
          options: [
            {
              key: "color",
              value: "Blue",
              sequence: 0,
            },
            {
              key: "size",
              value: "L",
              sequence: 1,
            },
          ],
        },
      },
    );
  typia.assert(variant2);
  // 6. Retrieve the snapshot list to get a valid snapshotId
  const snapshotPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "snapshot list is non-empty",
    snapshotPage.data.length > 0,
  );
  const snapshot = snapshotPage.data[0]!;
  const snapshotId = snapshot.id;
  // 7. Retrieve the SKU list for the snapshot to get a valid skuId
  const skuPage =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {},
      },
    );
  typia.assert(skuPage);
  TestValidator.predicate("sku list is non-empty", skuPage.data.length > 0);
  const skuSummary = skuPage.data[0]!;
  const skuId = skuSummary.id;
  // Test execution: GET the full detail of the SKU
  const sku =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        skuId: skuId,
      },
    );
  typia.assert(sku);
  // Validations
  TestValidator.equals("sku id matches requested skuId", sku.id, skuId);
  TestValidator.equals(
    "productSnapshotId matches requested snapshotId",
    sku.productSnapshotId,
    snapshotId,
  );
  TestValidator.predicate(
    "productVariantId is non-null",
    sku.productVariantId !== null,
  );
  TestValidator.predicate("skuCode is non-empty", sku.skuCode.length > 0);
  TestValidator.predicate("price is positive", sku.price > 0);
  TestValidator.predicate("options is non-empty array", sku.options.length > 0);
  // Validate each option has required fields
  for (const option of sku.options) {
    TestValidator.predicate("option id is non-empty", option.id.length > 0);
    TestValidator.predicate(
      "option product_snapshot_skus_id is non-empty",
      option.product_snapshot_skus_id.length > 0,
    );
    TestValidator.predicate("option key is non-empty", option.key.length > 0);
    TestValidator.predicate(
      "option value is non-empty",
      option.value.length > 0,
    );
  }
  // Validate options are ordered by sequence ascending
  for (let i = 1; i < sku.options.length; i++) {
    TestValidator.predicate(
      "options ordered by sequence ascending",
      sku.options[i]!.sequence >= sku.options[i - 1]!.sequence,
    );
  }
}
