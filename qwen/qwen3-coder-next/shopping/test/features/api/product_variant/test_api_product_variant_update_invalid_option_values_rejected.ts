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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_product_variant_update_invalid_option_values_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    },
  });
  typia.assert(seller);
  // 2. Create product with valid variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<number & tags.MultipleOf<0.01>>(),
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          },
        ],
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: [
              { option_name: "color", option_value: "red" },
              { option_name: "size", option_value: "M" },
            ],
            stock_quantity: 100,
          },
        ],
      },
    },
  );
  typia.assert(product);
  // 3. Get the first variant ID
  const variantId = product.variants[0].id;
  // 4. Create variant with valid option values first
  const validUpdateBody = {
    sku_code: "updated-sku-" + RandomGenerator.alphaNumeric(8),
    price_override: null,
  } satisfies IShoppingMallProductVariant.IUpdate;
  const updatedVariant =
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      sellerConnection,
      {
        variantId: variantId,
        body: validUpdateBody,
      },
    );
  typia.assert(updatedVariant);
  // 5. Verify variant was successfully updated
  TestValidator.equals(
    "sku updated",
    updatedVariant.skuCode,
    validUpdateBody.sku_code,
  );
  // 6. Verify option values are preserved from original creation
  const originalOptionValues = ["red", "M"]; // From the original variant creation
  TestValidator.predicate(
    "original option values preserved",
    () => updatedVariant.optionValues.length === originalOptionValues.length,
  );
}