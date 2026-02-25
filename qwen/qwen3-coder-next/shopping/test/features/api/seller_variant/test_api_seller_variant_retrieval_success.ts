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

export async function test_api_seller_variant_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for seller
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 1: Register seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234!@#$", // Password with special characters for validation
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const authorizedSeller = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: sellerData,
    },
  );
  typia.assert(authorizedSeller);
  // Step 2: Create product with variant using seller connection
  const categorySummary: IShoppingMallCategory.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: "Test Category",
    description: null,
    parent: null,
    subcategory_count: 0,
  };
  const sellerSummary: IShoppingMallSeller.ISummary = {
    id: authorizedSeller.data.profile.id,
    shop_name: authorizedSeller.data.profile.shop_name,
    approval_status: authorizedSeller.data.profile.approval_status,
    created_at: authorizedSeller.data.profile.created_at,
  };
  const productData: IShoppingMallProduct.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    shopping_mall_category_id: categorySummary.id,
    base_price: typia.random<
      number & tags.MultipleOf<0.01> & tags.Minimum<0>
    >(),
    images: [
      {
        image_url: RandomGenerator.alphaNumeric(10) + ".jpg",
        sort_order: 0,
      },
    ],
    variants: [
      {
        sku_code: RandomGenerator.alphaNumeric(10),
        option_values: [
          {
            option_name: "color",
            option_value: "red",
          },
        ],
        stock_quantity: 100,
      },
    ],
  };
  const createdProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: productData,
    });
  typia.assert(createdProduct);
  // Step 3: Verify variant retrieval
  const variant = createdProduct.variants[0];
  const retrievedVariant = await api.functional.shoppingMall.seller.variants.at(
    sellerConnection,
    {
      variantId: variant.id,
    },
  );
  typia.assert(retrievedVariant);
  // Step 4: Validate response structure
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
    "option values match",
    retrievedVariant.optionValues,
    variant.optionValues,
  );
  TestValidator.equals(
    "parent product matches",
    retrievedVariant.product.id,
    createdProduct.id,
  );
}
