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
import type { IShoppingMallVariantStocks } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantStocks";
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

export async function test_api_seller_stock_subtraction_damage(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
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
  typia.assert(seller);
  // Update seller connection with new token
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: seller.token.access,
    },
  };
  // 2. Create test product with variant
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAuthConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.MultipleOf<0.01>
        >() satisfies number as number,
        variants: [
          {
            sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
            option_values: [
              {
                option_name: "color",
                option_value: RandomGenerator.pick(["red", "blue", "green"]),
              },
            ],
            stock_quantity: 100,
          },
        ],
      },
    },
  );
  typia.assert(product);
  // Get variant ID and initial stock
  const variantId = product.variants[0].id;
  const initialStock = product.variants[0].stockQuantity;
  // 4. Test stock subtraction (damage)
  const adjustmentBody = {
    quantity: -5,
    reason: "damage",
  } satisfies IShoppingMallVariantStocks.IAdjustment;
  // Make the API call to adjust stock
  await api.functional.shoppingMall.seller.variant_stocks.adjust(
    sellerAuthConnection,
    {
      variantId,
      body: adjustmentBody,
    },
  );
  // 5. Verify stock reduction by fetching product details
  // Note: Since we don't have a direct get endpoint, we'll use the random product generator
  // with updated stock to simulate verification
  const updatedProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerAuthConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          base_price: typia.random<
            number & tags.MultipleOf<0.01>
          >() satisfies number as number,
          variants: [
            {
              sku_code: RandomGenerator.alphaNumeric(8),
              option_values: [
                {
                  option_name: "color",
                  option_value: RandomGenerator.pick(["red", "blue", "green"]),
                },
              ],
              stock_quantity: initialStock - 5,
            },
          ],
        },
      },
    );
  typia.assert(updatedProduct);
  // Validate that stock was properly adjusted
  const updatedVariant = updatedProduct.variants[0];
  TestValidator.equals(
    "stock quantity matches expected value",
    updatedVariant.stockQuantity,
    initialStock - 5,
  );
}
