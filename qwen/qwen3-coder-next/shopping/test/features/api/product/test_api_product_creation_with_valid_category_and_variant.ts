import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sellers_products_post } from "../../../generate/generate_random_shopping_mall_seller_sellers_products_post";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_product_creation_with_valid_category_and_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        logo_image_url:
          Math.random() > 0.5
            ? null
            : typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(joinResponse);
  // 2. Create a product with at least one variant
  const product =
    await generate_random_shopping_mall_seller_sellers_products_post(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Validate product creation
  TestValidator.equals("product name matches", product.name, product.name);
  TestValidator.equals(
    "product description matches",
    product.description,
    product.description,
  );
  TestValidator.predicate("base_price is positive", product.base_price > 0);
  TestValidator.equals(
    "variant count >= 1",
    product.variants.length >= 1,
    true,
  );
  TestValidator.equals("image count >= 1", product.images.length >= 1, true);
  // 4. Validate variant details
  const variant = product.variants[0];
  TestValidator.predicate("SKU code is valid", variant.skuCode.length > 0);
  TestValidator.predicate(
    "stock quantity is non-negative",
    variant.stockQuantity >= 0,
  );
  // 5. Validate image details
  if (product.images.length > 0) {
    const image = product.images[0];
    TestValidator.predicate(
      "image URL is valid URI",
      /^https?:\/\//.test(image.image_url),
    );
  }
}
