import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
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

export async function test_api_product_variant_list_other_seller_product_denied(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnectionA: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerConnectionA, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnectionA,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          status: RandomGenerator.alphaNumeric(8),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const variantBodies = [
    {
      sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
      option_summary: RandomGenerator.paragraph({ sentences: 2 }),
      price: 1000,
    },
    {
      sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
      option_summary: RandomGenerator.paragraph({ sentences: 2 }),
      price: null,
    },
  ] satisfies IShoppingMallProductVariant.ICreate[];
  const createdVariants = await ArrayUtil.asyncMap(
    variantBodies,
    async (body) =>
      await generate_random_shopping_mall_seller_seller_products_variants_create(
        sellerConnectionA,
        {
          params: { productId: product.id },
          body,
        },
      ),
  );
  createdVariants.forEach((variant) => typia.assert(variant));
  TestValidator.equals(
    "created variant count matches setup",
    createdVariants.length,
    variantBodies.length,
  );
  createdVariants.forEach((variant) => {
    TestValidator.equals(
      "variant belongs to created product",
      variant.product.id,
      product.id,
    );
  });
  const sellerConnectionB: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerConnectionB, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  await TestValidator.httpError(
    "other seller cannot list variants of another seller product",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.products.variants.index(
        sellerConnectionB,
        {
          productId: product.id,
          body: {
            page: 1,
            limit: 100,
            sort: "createdAt",
            direction: "asc",
          } satisfies IShoppingMallProductVariant.IRequest,
        },
      );
    },
  );
}
