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
import { generate_random_shopping_mall_seller_sellers_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_sellers_products_variants_create_variant";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test product variant creation with valid data.
 * 1. Create a seller account and login
 * 2. Create a product with initial variant
 * 3. Create additional variant for the same product
 * 4. Verify variant properties and SKU uniqueness validation
 */
export async function test_api_product_variant_creation_with_valid_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerInfo = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: RandomGenerator.alphabets(8) + "@test.com",
        password: "Password123!",
        shop_name: "Test Shop " + RandomGenerator.alphabets(4),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: null,
      },
    },
  );
  typia.assert(sellerInfo);
  // Create a new connection with the seller's token
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: sellerInfo.token.access,
    },
  };
  // 2. Create product with initial variant
  const product =
    await api.functional.shoppingMall.seller.sellers.products.post(
      sellerAuthConnection,
      {
        body: {
          name: "Test Product " + RandomGenerator.alphabets(6),
          description: RandomGenerator.content({ paragraphs: 3 }),
          base_price: 99.99,
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          images: [
            {
              image_url: "https://example.com/image1.jpg",
              sort_order: 0,
            },
          ],
          variants: [
            {
              sku_code: "INITIAL-VARIANT-" + RandomGenerator.alphaNumeric(6),
              option_values: [
                {
                  option_name: "color",
                  option_value: "red",
                },
              ],
              stock_quantity: 100,
            },
          ],
        },
      },
    );
  typia.assert(product);
  // 3. Create additional variant for the same product
  const newVariant =
    await api.functional.shoppingMall.seller.sellers.products.variants.createVariant(
      sellerAuthConnection,
      {
        productId: product.id,
        body: {
          sku_code: "NEW-VARIANT-" + RandomGenerator.alphaNumeric(6),
          option_values: [
            {
              option_name: "color",
              option_value: "blue",
            },
          ],
          stock_quantity: 50,
        },
      },
    );
  typia.assert(newVariant);
  // 4. Verify variant properties
  TestValidator.equals(
    "product ID matches",
    newVariant.shoppingMallProductId,
    product.id,
  );
  TestValidator.equals(
    "first option value is blue",
    newVariant.optionValues[0],
    "blue",
  );
  TestValidator.equals("stock quantity is 50", newVariant.stockQuantity, 50);
  // 5. Verify SKU uniqueness - try to create duplicate SKU (should fail)
  await TestValidator.error("SKU uniqueness validation", async () => {
    await api.functional.shoppingMall.seller.sellers.products.variants.createVariant(
      sellerAuthConnection,
      {
        productId: product.id,
        body: {
          sku_code: newVariant.skuCode, // duplicate SKU
          option_values: [
            {
              option_name: "size",
              option_value: "L",
            },
          ],
          stock_quantity: 30,
        },
      },
    );
  });
  // 6. Verify option combination uniqueness - try to create duplicate option combination
  await TestValidator.error(
    "option combination uniqueness validation",
    async () => {
      await api.functional.shoppingMall.seller.sellers.products.variants.createVariant(
        sellerAuthConnection,
        {
          productId: product.id,
          body: {
            sku_code: "DIFFERENT-SKU-" + RandomGenerator.alphaNumeric(6),
            option_values: [
              {
                option_name: "color",
                option_value: "blue", // same option combination
              },
            ],
            stock_quantity: 30,
          },
        },
      );
    },
  );
}
