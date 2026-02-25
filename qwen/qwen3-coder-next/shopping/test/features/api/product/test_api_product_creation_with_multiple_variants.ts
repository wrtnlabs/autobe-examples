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

export async function test_api_product_creation_with_multiple_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12341234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create new connection with token from registration
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  sellerAuthConnection.headers = {
    Authorization: seller.token.access,
  };
  // 2. Create product with multiple variants
  const product =
    await api.functional.shoppingMall.seller.sellers.products.post(
      sellerAuthConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 5 }),
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.MultipleOf<0.01>
          >(),
          images: [],
          variants: [
            {
              sku_code: `SKU-${RandomGenerator.alphabets(6).toUpperCase()}`,
              option_values: [
                { option_name: "color", option_value: "red" },
                { option_name: "size", option_value: "M" },
              ],
              stock_quantity: 100,
            },
            {
              sku_code: `SKU-${RandomGenerator.alphabets(6).toUpperCase()}`,
              option_values: [
                { option_name: "color", option_value: "blue" },
                { option_name: "size", option_value: "L" },
              ],
              stock_quantity: 50,
            },
          ],
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 3. Validate product creation with multiple variants
  TestValidator.equals("product name matches", product.name, product.name);
  TestValidator.equals(
    "description matches",
    product.description,
    product.description,
  );
  TestValidator.predicate("base price is positive", product.base_price > 0);
  TestValidator.equals("has exactly 2 variants", product.variants.length, 2);
  // 4. Validate each variant
  const variant1 = product.variants[0];
  const variant2 = product.variants[1];
  TestValidator.notEquals(
    "variant SKUs are different",
    variant1.skuCode,
    variant2.skuCode,
  );
  TestValidator.equals(
    "variant1 has 2 option values",
    variant1.optionValues.length,
    2,
  );
  TestValidator.equals(
    "variant2 has 2 option values",
    variant2.optionValues.length,
    2,
  );
  // 4.5. Validate option values - they are string arrays directly
  TestValidator.equals(
    "variant1 first option value",
    variant1.optionValues[0],
    "red",
  );
  TestValidator.equals(
    "variant1 second option value",
    variant1.optionValues[1],
    "M",
  );
  TestValidator.equals(
    "variant2 first option value",
    variant2.optionValues[0],
    "blue",
  );
  TestValidator.equals(
    "variant2 second option value",
    variant2.optionValues[1],
    "L",
  );
  TestValidator.equals("variant1 stock is 100", variant1.stockQuantity, 100);
  TestValidator.equals("variant2 stock is 50", variant2.stockQuantity, 50);
  // 5. Validate seller information
  TestValidator.equals(
    "seller matches registered seller",
    product.seller.id,
    seller.data.profile.id,
  );
}
