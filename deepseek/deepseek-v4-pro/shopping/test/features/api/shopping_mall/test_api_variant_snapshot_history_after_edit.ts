import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_variant_snapshot_history_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant with initial values
  const initialSkuCode = RandomGenerator.alphaNumeric(10);
  const initialPrice = 5000;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          code: initialSkuCode,
          price: initialPrice,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Edit variant to trigger snapshot
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          code: RandomGenerator.alphaNumeric(10),
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Query snapshot listing
  const snapshots =
    await api.functional.shoppingMall.seller.products.variants.snapshots.patchByProductidAndVariantid(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {} satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Validate snapshot contents
  TestValidator.predicate(
    "has at least one snapshot",
    snapshots.data.length >= 1,
  );
  const firstSnapshot = snapshots.data[0];
  TestValidator.equals(
    "snapshot SKU code matches original",
    firstSnapshot.sku_code,
    initialSkuCode,
  );
  TestValidator.equals(
    "snapshot price matches original variant price",
    firstSnapshot.price,
    initialPrice,
  );
  TestValidator.predicate(
    "snapshot option_values contain original color",
    firstSnapshot.option_values.includes("color: Blue"),
  );
  TestValidator.predicate(
    "snapshot option_values contain original size",
    firstSnapshot.option_values.includes("size: Medium"),
  );
  // Verify snapshots sorted newest first
  if (snapshots.data.length >= 2) {
    TestValidator.predicate(
      "snapshots sorted newest first",
      snapshots.data[0].created_at >= snapshots.data[1].created_at,
    );
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination has at least one record",
    snapshots.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    snapshots.pagination.current >= 1,
  );
}
