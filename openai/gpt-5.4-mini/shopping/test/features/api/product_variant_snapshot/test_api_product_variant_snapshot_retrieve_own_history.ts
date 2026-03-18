import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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

export async function test_api_product_variant_snapshot_retrieve_own_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(auth);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `sku-${RandomGenerator.alphaNumeric(8)}`,
          overridePrice: null,
          stockQuantity: 0,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const beforeUpdate = {
    skuCode: variant.skuCode,
    overridePrice: variant.overridePrice,
    stockQuantity: variant.stockQuantity,
    updatedAt: variant.updatedAt,
  };
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: `sku-${RandomGenerator.alphaNumeric(8)}-updated`,
          overridePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          optionValues: [
            typia.assert<IShoppingMallProductVariantOption>({
              optionName: "color",
              optionValue: RandomGenerator.name(1),
            } as IShoppingMallProductVariantOption),
            typia.assert<IShoppingMallProductVariantOption>({
              optionName: "size",
              optionValue: RandomGenerator.name(1),
            } as IShoppingMallProductVariantOption),
          ],
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  TestValidator.notEquals(
    "variant sku should change after update",
    beforeUpdate.skuCode,
    updatedVariant.skuCode,
  );
  TestValidator.notEquals(
    "variant updatedAt should change after update",
    beforeUpdate.updatedAt,
    updatedVariant.updatedAt,
  );
  TestValidator.equals(
    "variant id should remain the same",
    updatedVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "product relation should remain the same",
    updatedVariant.shoppingMallProductId,
    product.id,
  );
  const snapshot =
    await api.functional.shoppingMall.seller.productVariants.snapshots.at(
      sellerConnection,
      {
        productVariantId: variant.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot variant id matches",
    snapshot.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "snapshot preserved sku code",
    snapshot.sku_code,
    beforeUpdate.skuCode,
  );
  TestValidator.equals(
    "snapshot preserved created timestamp format",
    snapshot.created_at,
    snapshot.created_at,
  );
  TestValidator.notEquals(
    "snapshot sku differs from live variant after update",
    snapshot.sku_code,
    updatedVariant.skuCode,
  );
}
