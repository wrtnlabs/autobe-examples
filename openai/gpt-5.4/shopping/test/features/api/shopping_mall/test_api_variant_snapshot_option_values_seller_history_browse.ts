import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IPageIShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshotOptionValue";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_variant_snapshot_option_values_seller_history_browse(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 10000,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const originalSku = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const originalOptionSummary = "Color Red / Size Large";
  const originalPrice = 12000;
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: originalSku,
          option_summary: originalOptionSummary,
          price: originalPrice,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const updatedSku = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const updatedOptionSummary = "Color Blue / Size Medium";
  const updatedPrice = 14500;
  const updatedVariant =
    await api.functional.shoppingMall.seller.seller_products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: updatedSku,
          option_summary: updatedOptionSummary,
          price: updatedPrice,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  TestValidator.equals(
    "variant sku updated",
    updatedVariant.sku_code,
    updatedSku,
  );
  TestValidator.equals(
    "variant option summary updated",
    updatedVariant.option_summary,
    updatedOptionSummary,
  );
  TestValidator.equals(
    "variant price updated",
    updatedVariant.price,
    updatedPrice,
  );
  TestValidator.notEquals(
    "live variant sku differs from original",
    updatedVariant.sku_code,
    originalSku,
  );
  TestValidator.notEquals(
    "live variant option summary differs from original",
    updatedVariant.option_summary,
    originalOptionSummary,
  );
  TestValidator.notEquals(
    "live variant price differs from original",
    updatedVariant.price,
    originalPrice,
  );
  const snapshotPage =
    await api.functional.shoppingMall.seller.seller_products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.equals(
    "snapshot page current page",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "snapshot page returned rows within page limit",
    snapshotPage.data.length <= snapshotPage.pagination.limit,
  );
  TestValidator.predicate(
    "snapshot page contains at least one snapshot",
    snapshotPage.data.length > 0,
  );
  TestValidator.predicate(
    "snapshot pagination records cover data size",
    snapshotPage.pagination.records >= snapshotPage.data.length,
  );
  const exactSnapshot = snapshotPage.data.find(
    (snap) =>
      snap.productVariant.id === variant.id &&
      snap.skuCode === originalSku &&
      snap.price === originalPrice,
  );
  const matchedSnapshot = exactSnapshot ?? snapshotPage.data[0]!;
  TestValidator.equals(
    "snapshot belongs to target variant",
    matchedSnapshot.productVariant.id,
    variant.id,
  );
  TestValidator.notEquals(
    "snapshot sku differs from current live variant sku",
    matchedSnapshot.skuCode,
    updatedVariant.sku_code,
  );
  if (exactSnapshot !== undefined) {
    TestValidator.equals(
      "exact snapshot preserved original sku",
      exactSnapshot.skuCode,
      originalSku,
    );
    TestValidator.equals(
      "exact snapshot preserved original price",
      exactSnapshot.price,
      originalPrice,
    );
  }
  const optionValuePage =
    await api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        productVariantSnapshotId: matchedSnapshot.id,
        body: {
          page: 1,
          limit: 100,
          sort: "created_at",
        } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(optionValuePage);
  TestValidator.equals(
    "option value page current page",
    optionValuePage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "option value page returned rows within page limit",
    optionValuePage.data.length <= optionValuePage.pagination.limit,
  );
  TestValidator.predicate(
    "option value pagination records cover data size",
    optionValuePage.pagination.records >= optionValuePage.data.length,
  );
  TestValidator.predicate(
    "option value pagination pages non negative",
    optionValuePage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "historical option rows equal selected snapshot option values",
    optionValuePage.data,
    matchedSnapshot.optionValues,
  );
}
