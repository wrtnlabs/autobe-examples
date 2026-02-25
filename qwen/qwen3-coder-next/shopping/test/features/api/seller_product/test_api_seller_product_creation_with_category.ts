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

export async function test_api_seller_product_creation_with_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: null,
    },
  });
  typia.assert(joinResponse);
  // 2. Create seller-specific connection with token
  const sellerAuthTokenConnection: api.IConnection = { host: connection.host };
  sellerAuthTokenConnection.headers = {
    Authorization: joinResponse.token.access,
  };
  // 3. Generate a random category ID for testing (since category API is not available)
  // We use a valid UUID format as required by the schema, but it may not exist in the database
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create product with the category
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerAuthTokenConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.MultipleOf<0.01>
        >(),
        images: [
          {
            image_url: RandomGenerator.paragraph({ sentences: 1 }),
            sort_order: 0,
          },
        ] satisfies IShoppingMallProductImage.ICreate[] & tags.MinItems<1>,
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(10),
            option_values: [
              {
                option_name: "size",
                option_value: "M",
              },
            ] satisfies IShoppingMallProductVariantOptionValue.ICreate[] &
              tags.MinItems<1>,
            stock_quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          },
        ] satisfies IShoppingMallProductVariant.ICreate[] & tags.MinItems<1>,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Validate product properties
  TestValidator.equals(
    "product name matches",
    product.name,
    joinResponse.data.profile.shop_name,
  );
  TestValidator.equals("category ID matches", product.category.id, categoryId);
  TestValidator.equals(
    "seller ID matches",
    product.seller.id,
    joinResponse.data.profile.id,
  );
  // 6. Confirm approval status preserved
  TestValidator.equals(
    "seller approval status",
    product.seller.approval_status,
    joinResponse.data.profile.approval_status,
  );
}
