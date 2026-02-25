import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
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

export async function test_api_product_variant_creation_with_duplicate_sku(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials: IShoppingMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, { body: sellerCredentials });
  // 2. Create product with initial variant using utility function
  const productBody: IShoppingMallProduct.ICreate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    base_price: typia.random<
      number & tags.Minimum<0.01>
    >() satisfies number as number,
    variants: [
      {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: typia.random<
          number & tags.Minimum<0.01>
        >() satisfies number as number,
        options: [
          {
            option_name: "color",
            option_value: "red",
          },
        ],
      },
    ],
  } satisfies IShoppingMallProduct.ICreate;
  // Use utility function instead of direct SDK call
  const createdProduct: IShoppingMallCustomer =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      { body: productBody },
    );
  // Extract product ID from the returned customer object (this is the actual return type)
  const productId: string = createdProduct.id;
  // 3. Extract the existing variant SKU
  // Ensure variants array exists and has at least one item
  if (!productBody.variants || productBody.variants.length === 0) {
    throw new Error("Product must have at least one variant for this test");
  }
  const existingVariantSku: string = productBody.variants[0].sku_code;
  // 4. Attempt to create duplicate variant with same SKU
  const duplicateVariantBody: IShoppingMallProductVariant.ICreate = {
    sku_code: existingVariantSku,
    price: typia.random<
      number & tags.Minimum<0.01>
    >() satisfies number as number,
    options: [
      {
        option_name: "size",
        option_value: "large",
      },
    ],
  } satisfies IShoppingMallProductVariant.ICreate;
  // 5. Validate that duplicate SKU causes 409 Conflict error using utility function
  await TestValidator.error("duplicate SKU should be blocked", async () => {
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: duplicateVariantBody,
        params: { productId },
      },
    );
  });
}
