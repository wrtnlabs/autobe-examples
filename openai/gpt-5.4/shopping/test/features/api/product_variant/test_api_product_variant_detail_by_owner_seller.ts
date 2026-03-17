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

export async function test_api_product_variant_detail_by_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 13579,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  TestValidator.equals(
    "created product seller id matches authorized seller",
    product.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "created product seller email matches authorized seller",
    product.seller.email,
    sellerAuth.email,
  );
  const pricedVariantBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    option_summary: `${RandomGenerator.name(1)} / ${RandomGenerator.name(1)}`,
    price: 24680,
  } satisfies IShoppingMallProductVariant.ICreate;
  const pricedVariant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: pricedVariantBody,
      },
    );
  typia.assert(pricedVariant);
  const nullPriceVariantBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}-NULL`,
    option_summary: `${RandomGenerator.name(1)} / ${RandomGenerator.name(1)} / default`,
    price: null,
  } satisfies IShoppingMallProductVariant.ICreate;
  const nullPriceVariant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: nullPriceVariantBody,
      },
    );
  typia.assert(nullPriceVariant);
  const pricedDetail = await api.functional.shoppingMall.products.variants.at(
    sellerConnection,
    {
      productId: product.id,
      variantId: pricedVariant.id,
    },
  );
  typia.assert(pricedDetail);
  TestValidator.equals(
    "priced variant id matches",
    pricedDetail.id,
    pricedVariant.id,
  );
  TestValidator.equals(
    "priced variant sku_code matches",
    pricedDetail.sku_code,
    pricedVariantBody.sku_code,
  );
  TestValidator.equals(
    "priced variant option_summary matches",
    pricedDetail.option_summary,
    pricedVariantBody.option_summary,
  );
  TestValidator.equals(
    "priced variant price preserves exact override",
    pricedDetail.price,
    pricedVariantBody.price,
  );
  TestValidator.equals(
    "priced detail parent product id matches",
    pricedDetail.product.id,
    product.id,
  );
  TestValidator.equals(
    "priced detail parent product name matches",
    pricedDetail.product.name,
    product.name,
  );
  TestValidator.equals(
    "priced detail parent product description matches",
    pricedDetail.product.description,
    product.description,
  );
  TestValidator.equals(
    "priced detail parent product base price matches",
    pricedDetail.product.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "priced detail parent product status matches",
    pricedDetail.product.status,
    product.status,
  );
  TestValidator.equals(
    "priced detail parent product seller id matches owner",
    pricedDetail.product.seller.id,
    product.seller.id,
  );
  TestValidator.equals(
    "priced detail parent product seller id matches authorized seller",
    pricedDetail.product.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "priced detail parent product seller email matches owner",
    pricedDetail.product.seller.email,
    product.seller.email,
  );
  TestValidator.equals(
    "priced detail parent product seller email matches authorized seller",
    pricedDetail.product.seller.email,
    sellerAuth.email,
  );
  const nullPriceDetail =
    await api.functional.shoppingMall.products.variants.at(sellerConnection, {
      productId: product.id,
      variantId: nullPriceVariant.id,
    });
  typia.assert(nullPriceDetail);
  TestValidator.equals(
    "null-price variant id matches",
    nullPriceDetail.id,
    nullPriceVariant.id,
  );
  TestValidator.equals(
    "null-price variant sku_code matches",
    nullPriceDetail.sku_code,
    nullPriceVariantBody.sku_code,
  );
  TestValidator.equals(
    "null-price variant option_summary matches",
    nullPriceDetail.option_summary,
    nullPriceVariantBody.option_summary,
  );
  TestValidator.equals(
    "null-price variant price remains null",
    nullPriceDetail.price,
    null,
  );
  TestValidator.notEquals(
    "null-price variant price is not substituted with product base price",
    nullPriceDetail.price,
    product.base_price,
  );
  TestValidator.equals(
    "null-price detail parent product id matches",
    nullPriceDetail.product.id,
    product.id,
  );
  TestValidator.equals(
    "null-price detail parent product seller id matches owner",
    nullPriceDetail.product.seller.id,
    product.seller.id,
  );
  TestValidator.equals(
    "null-price detail parent product seller id matches authorized seller",
    nullPriceDetail.product.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "null-price detail parent product seller email matches owner",
    nullPriceDetail.product.seller.email,
    product.seller.email,
  );
  TestValidator.equals(
    "null-price detail parent product seller email matches authorized seller",
    nullPriceDetail.product.seller.email,
    sellerAuth.email,
  );
}
