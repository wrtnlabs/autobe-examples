import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function test_api_product_variant_detail_mismatched_parent_product_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {},
  );
  typia.assert(seller);
  const firstProduct: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: `product-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 1000,
          status: "active",
        },
      },
    );
  typia.assert(firstProduct);
  const secondProduct: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: `product-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 2000,
          status: "active",
        },
      },
    );
  typia.assert(secondProduct);
  TestValidator.notEquals(
    "products must be different resources",
    firstProduct.id,
    secondProduct.id,
  );
  const variant: IShoppingMallProductVariant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: firstProduct.id,
        },
        body: {
          sku_code: `sku-${RandomGenerator.alphaNumeric(10)}`,
          option_summary: RandomGenerator.paragraph({ sentences: 3 }),
          price: 1500,
        },
      },
    );
  typia.assert(variant);
  TestValidator.equals(
    "variant belongs to the first product",
    variant.product.id,
    firstProduct.id,
  );
  TestValidator.notEquals(
    "mismatched parent product differs from actual parent",
    secondProduct.id,
    variant.product.id,
  );
  await TestValidator.error(
    "rejects retrieving a variant through a different parent product path",
    async () => {
      await api.functional.shoppingMall.seller.seller_products.variants.at(
        sellerConnection,
        {
          productId: secondProduct.id,
          variantId: variant.id,
        },
      );
    },
  );
}
