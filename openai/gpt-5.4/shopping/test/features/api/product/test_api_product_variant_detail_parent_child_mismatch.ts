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

export async function test_api_product_variant_detail_parent_child_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const firstProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 100,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(firstProduct);
  const secondProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 200,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(secondProduct);
  TestValidator.notEquals(
    "products must be distinct",
    firstProduct.id,
    secondProduct.id,
  );
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: firstProduct.id,
        },
        body: {
          sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: RandomGenerator.paragraph({ sentences: 3 }),
          price: 150,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  TestValidator.equals(
    "variant belongs to first product",
    variant.product.id,
    firstProduct.id,
  );
  TestValidator.notEquals(
    "variant parent is not second product",
    variant.product.id,
    secondProduct.id,
  );
  await TestValidator.httpError(
    "mismatched parent product route rejects variant detail access",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.products.variants.at(sellerConnection, {
        productId: secondProduct.id,
        variantId: variant.id,
      });
    },
  );
}
