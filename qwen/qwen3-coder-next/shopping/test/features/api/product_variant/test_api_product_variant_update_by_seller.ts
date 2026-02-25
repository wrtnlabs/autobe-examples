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

export async function test_api_product_variant_update_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: sellerJoinInput,
    },
  );
  typia.assert(sellerAuthorized);
  // Create new connection with seller's token
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuthorized.token.access,
    },
  };
  // 2. Create product with variants
  // Note: Without categories.list function, we need to use a valid category ID
  // For testing purposes, we'll assume a default category exists
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const productInput = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    shopping_mall_category_id: categoryId,
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    images: [
      {
        image_url: typia.random<string & tags.Format<"uri">>(),
        sort_order: 0,
      },
    ],
    variants: [
      {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        option_values: [
          {
            option_name: "color",
            option_value: "red",
          },
          {
            option_name: "size",
            option_value: "M",
          },
        ],
        price_override: null,
        stock_quantity: 100,
      },
    ],
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerAuthConnection,
    {
      body: productInput,
    },
  );
  typia.assert(product);
  TestValidator.equals("product created", product.variants.length, 1);
  const originalVariant = product.variants[0];
  // 3. Update product variant
  const newSkuCode = `UPDATED-${RandomGenerator.alphaNumeric(8)}`;
  const updateInput = {
    sku_code: newSkuCode,
    price_override:
      (originalVariant.priceOverride ?? product.base_price) + 1000,
  } satisfies IShoppingMallProductVariant.IUpdate;
  const updatedVariant =
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      sellerAuthConnection,
      {
        variantId: originalVariant.id,
        body: updateInput,
      },
    );
  typia.assert(updatedVariant);
  // 4. Verify SKU code was updated
  TestValidator.equals("SKU code updated", updatedVariant.skuCode, newSkuCode);
  // 5. Verify price was updated
  TestValidator.equals(
    "price updated",
    updatedVariant.priceOverride,
    updateInput.price_override,
  );
  // 6. Verify option values remain unchanged
  TestValidator.equals(
    "option values preserved",
    updatedVariant.optionValues.length,
    2,
  );
  const optionValues = updatedVariant.optionValues;
  TestValidator.equals(
    "option values contain expected",
    optionValues.includes("red") && optionValues.includes("M"),
    true,
  );
  // 7. Verify product still has correct variant by checking the returned variant
  TestValidator.equals(
    "variant ID matches",
    updatedVariant.id,
    originalVariant.id,
  );
  // Verify the updated variant is the same object with updated properties
  TestValidator.equals(
    "variant SKU matches updated",
    updatedVariant.skuCode,
    newSkuCode,
  );
}
