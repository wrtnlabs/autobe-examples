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

export async function test_api_product_variant_detail_by_administrator_oversight(
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
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          status: RandomGenerator.alphaNumeric(8),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const variantBody = {
    sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    option_summary: RandomGenerator.paragraph({ sentences: 3 }),
    price: null,
  } satisfies IShoppingMallProductVariant.ICreate;
  const createdVariant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: variantBody,
      },
    );
  typia.assert(createdVariant);
  const readerConnection: api.IConnection = { host: connection.host };
  const variant = await api.functional.shoppingMall.products.variants.at(
    readerConnection,
    {
      productId: product.id,
      variantId: createdVariant.id,
    },
  );
  typia.assert(variant);
  TestValidator.equals("variant id matches", variant.id, createdVariant.id);
  TestValidator.equals(
    "parent product id matches",
    variant.product.id,
    product.id,
  );
  TestValidator.equals(
    "option summary matches",
    variant.option_summary,
    createdVariant.option_summary,
  );
  TestValidator.equals(
    "nullable price semantics preserved",
    variant.price,
    createdVariant.price,
  );
  TestValidator.equals(
    "product name matches",
    variant.product.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    variant.product.description,
    product.description,
  );
  TestValidator.equals(
    "product base price matches",
    variant.product.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "product status matches",
    variant.product.status,
    product.status,
  );
  TestValidator.equals(
    "nested seller id matches",
    variant.product.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "product summary deleted_at remains null",
    variant.product.deleted_at,
    null,
  );
  TestValidator.equals(
    "variant deleted_at remains null",
    variant.deleted_at,
    null,
  );
  const variantAgain = await api.functional.shoppingMall.products.variants.at(
    readerConnection,
    {
      productId: product.id,
      variantId: createdVariant.id,
    },
  );
  typia.assert(variantAgain);
  TestValidator.equals(
    "non-mutating read returns same variant state",
    variantAgain,
    variant,
  );
}
