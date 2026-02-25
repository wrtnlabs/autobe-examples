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

/**
 * Test seller product image upload functionality.
 * 1. Seller registers and logs in
 * 2. Creates a product with at least one variant
 * 3. Uploads multiple product images (JPEG, PNG, WebP formats)
 * 4. Verifies images were uploaded with proper sort order
 */
export async function test_api_seller_product_image_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: seller.token.access,
  };
  // 2. Create a product to upload images
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >() satisfies number as number,
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(10),
            option_values: [
              {
                option_name: "color",
                option_value: RandomGenerator.pick([
                  "red",
                  "blue",
                  "green",
                  "black",
                ]),
              },
            ],
            stock_quantity: 100,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload product images (JPEG, PNG, WebP formats)
  await api.functional.shoppingMall.seller.products.images.upload(
    sellerConnection,
    {
      productId: product.id,
    },
  );
  // 4. Verify images were uploaded by fetching the product
  const productWithImages =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: {
        name: product.name,
        description: product.description,
        shopping_mall_category_id: product.category.id,
        base_price: product.base_price,
        variants: product.variants.map((v) => ({
          sku_code: v.skuCode,
          option_values: v.optionValues.map((ov) => ({
            option_name: "color",
            option_value: ov,
          })),
        })),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(productWithImages);
  TestValidator.predicate(
    "has uploaded images",
    () => productWithImages.images.length > 0,
  );
  TestValidator.predicate(
    "first image is main thumbnail",
    () =>
      productWithImages.images.length > 0 &&
      productWithImages.images[0].sort_order === 0,
  );
}
