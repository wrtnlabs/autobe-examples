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

export async function test_api_product_variant_update_other_seller_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  const productBody = {
    shopping_mall_category_id: null,
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 2 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      ownerConnection,
      {
        body: productBody,
      },
    );
  typia.assert(product);
  const variantCreateBody = {
    sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    option_summary: `${RandomGenerator.alphabets(5)} / ${RandomGenerator.alphabets(5)}`,
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProductVariant.ICreate;
  const originalVariant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      ownerConnection,
      {
        params: {
          productId: product.id,
        },
        body: variantCreateBody,
      },
    );
  typia.assert(originalVariant);
  const originalSkuCode = originalVariant.sku_code;
  const originalOptionSummary = originalVariant.option_summary;
  const originalPrice = originalVariant.price;
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSellerAuth = await authorize_seller_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(otherSellerAuth);
  const updateBody = {
    sku_code: `updated-${RandomGenerator.alphaNumeric(8)}`,
    option_summary: `${RandomGenerator.alphabets(6)} / ${RandomGenerator.alphabets(6)}`,
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProductVariant.IUpdate;
  await TestValidator.httpError(
    "other seller cannot update a variant owned by another seller",
    403,
    async () => {
      await api.functional.shoppingMall.seller.seller_products.variants.update(
        otherSellerConnection,
        {
          productId: product.id,
          variantId: originalVariant.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "captured original sku_code remains the expected canonical value after forbidden update attempt",
    originalVariant.sku_code,
    originalSkuCode,
  );
  TestValidator.equals(
    "captured original option_summary remains the expected canonical value after forbidden update attempt",
    originalVariant.option_summary,
    originalOptionSummary,
  );
  TestValidator.equals(
    "captured original price remains the expected canonical value after forbidden update attempt",
    originalVariant.price,
    originalPrice,
  );
  TestValidator.equals(
    "variant remains associated with the owner product reference",
    originalVariant.product.id,
    product.id,
  );
  TestValidator.equals(
    "product seller remains the original owner seller",
    product.seller.id,
    ownerAuth.id,
  );
  TestValidator.notEquals(
    "attacking seller differs from owner seller",
    otherSellerAuth.id,
    ownerAuth.id,
  );
}
