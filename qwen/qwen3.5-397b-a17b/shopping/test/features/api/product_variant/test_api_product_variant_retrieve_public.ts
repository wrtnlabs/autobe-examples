import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test that product variant details can be retrieved by any user (public access).
 *
 * This test validates:
 * 1. Seller account creation and authentication
 * 2. Product creation with variants by seller
 * 3. Public variant retrieval without authentication
 * 4. Complete variant information including options, SKU, stock, and price
 * 5. Variant belongs to correct product with proper option configurations
 */
export async function test_api_product_variant_retrieve_public(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create seller-specific connection with authentication token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 3. Create a product for the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Create a variant for the product with unique option keys
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          options: [
            {
              key: "color",
              value: RandomGenerator.name(),
            },
            {
              key: "size",
              value: RandomGenerator.pick([
                "Small",
                "Medium",
                "Large",
                "XL",
              ] as const),
            },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Retrieve variant details using public endpoint (no authentication)
  const publicConnection: api.IConnection = {
    host: connection.host,
  };
  const retrievedVariant =
    await api.functional.shoppingMall.products.variants.at(publicConnection, {
      productId: product.id,
      variantId: variant.id,
    });
  typia.assert(retrievedVariant);
  // 6. Validate variant data integrity
  TestValidator.equals("variant ID matches", retrievedVariant.id, variant.id);
  TestValidator.equals(
    "SKU code matches",
    retrievedVariant.skuCode,
    variant.skuCode,
  );
  TestValidator.equals(
    "stock quantity matches",
    retrievedVariant.stockQuantity,
    variant.stockQuantity,
  );
  TestValidator.equals(
    "product ID matches",
    retrievedVariant.product.id,
    product.id,
  );
  TestValidator.equals(
    "option count matches",
    retrievedVariant.options.length,
    variant.options.length,
  );
  // Validate each option key-value pair
  for (let i = 0; i < retrievedVariant.options.length; i++) {
    TestValidator.equals(
      `option ${i} key matches`,
      retrievedVariant.options[i].key,
      variant.options[i].key,
    );
    TestValidator.equals(
      `option ${i} value matches`,
      retrievedVariant.options[i].value,
      variant.options[i].value,
    );
  }
  // Validate price if set (price can be null/undefined or number)
  if (variant.price !== null && variant.price !== undefined) {
    TestValidator.equals(
      "price matches",
      retrievedVariant.price,
      variant.price,
    );
  }
}
