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

export async function test_api_product_snapshot_sku_preserved_after_variant_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: authenticate and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // 2. Seller setup: authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Product creation
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Variant creation: create a specific variant (color: Green, size: S)
  const variantSku = `SKU-GREEN-S-${RandomGenerator.alphaNumeric(8)}`;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: variantSku,
          options: [
            {
              key: "color",
              value: "Green",
              sequence: 0,
            },
            {
              key: "size",
              value: "S",
              sequence: 1,
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // 5. Retrieve the latest snapshot list to find snapshotId triggered by variant creation
  const snapshotPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // Pick the most recent snapshot (index 0 since ordered newest first)
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshotPage.data.length > 0,
  );
  const latestSnapshot = snapshotPage.data[0]!;
  // 6. Retrieve SKU list for that snapshot
  const skuPage =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        body: {
          limit: 100,
          page: 1,
        } satisfies IShoppingMallProductSnapshotSkus.IRequest,
      },
    );
  typia.assert(skuPage);
  // Find the SKU corresponding to the just-created variant (match by SKU code)
  TestValidator.predicate(
    "at least one SKU exists in snapshot",
    skuPage.data.length > 0,
  );
  const targetSkuSummary = skuPage.data.find(
    (sku) => sku.skuCode === variant.sku,
  );
  TestValidator.predicate(
    "target SKU found in snapshot",
    targetSkuSummary !== undefined,
  );
  const skuSummary = targetSkuSummary!;
  const originalSkuCode = skuSummary.skuCode;
  const originalPrice = skuSummary.price;
  const originalOptions = skuSummary.options;
  // 7. Delete the originating variant
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  // 8. Test execution: retrieve the snapshot SKU after variant deletion
  const snapshotSku =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        skuId: skuSummary.id,
      },
    );
  typia.assert(snapshotSku);
  // 9. Validations
  // id matches requested skuId
  TestValidator.equals(
    "snapshot SKU id matches",
    snapshotSku.id,
    skuSummary.id,
  );
  // productSnapshotId matches requested snapshotId
  TestValidator.equals(
    "productSnapshotId matches",
    snapshotSku.productSnapshotId,
    latestSnapshot.id,
  );
  // productVariantId is null (reflecting that the originating variant has been deleted)
  TestValidator.equals(
    "productVariantId is null after deletion",
    snapshotSku.productVariantId,
    null,
  );
  // skuCode still matches the original SKU code (preserved verbatim at snapshot time)
  TestValidator.equals(
    "skuCode preserved verbatim",
    snapshotSku.skuCode,
    originalSkuCode,
  );
  // price matches the original captured price (positive number)
  TestValidator.equals("price preserved", snapshotSku.price, originalPrice);
  TestValidator.predicate("price is positive", snapshotSku.price > 0);
  // options is a non-empty array, fully intact
  TestValidator.predicate(
    "options is non-empty array",
    snapshotSku.options.length > 0,
  );
  // options count matches original
  TestValidator.equals(
    "options count matches original",
    snapshotSku.options.length,
    originalOptions.length,
  );
  // Verify color: Green option is present
  const colorOption = snapshotSku.options.find((o) => o.key === "color");
  TestValidator.predicate("color option exists", colorOption !== undefined);
  TestValidator.equals(
    "color option value is Green",
    colorOption!.value,
    "Green",
  );
  // Verify size: S option is present
  const sizeOption = snapshotSku.options.find((o) => o.key === "size");
  TestValidator.predicate("size option exists", sizeOption !== undefined);
  TestValidator.equals("size option value is S", sizeOption!.value, "S");
  // createdAt is a valid ISO 8601 datetime (validated by typia.assert above)
  TestValidator.predicate(
    "createdAt is non-empty string",
    snapshotSku.createdAt.length > 0,
  );
}
