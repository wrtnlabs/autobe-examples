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

export async function test_api_product_variant_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerRegisterData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerRegisterData,
  });
  typia.assert(sellerAuthorized);
  // 2. Create seller-specific connection with token
  const sellerTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: sellerAuthorized.token.access,
    },
  };
  // 3. Create a product with multiple variants
  const productCreateBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
    base_price: 10000,
    variants: [
      {
        sku_code: `VARIANT_${RandomGenerator.alphaNumeric(8)}`,
        option_values: [
          { option_name: "color", option_value: "red" },
          { option_name: "size", option_value: "M" },
        ],
        stock_quantity: 100,
      },
      {
        sku_code: `VARIANT_${RandomGenerator.alphaNumeric(8)}`,
        option_values: [
          { option_name: "color", option_value: "blue" },
          { option_name: "size", option_value: "L" },
        ],
        stock_quantity: 50,
      },
    ] as IShoppingMallProductVariant.ICreate[],
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerTokenConnection,
    {
      body: productCreateBody,
    },
  );
  typia.assert(product);
  // Verify product has variants
  TestValidator.predicate("product has variants", product.variants.length >= 2);
  const variantToBeDeleted = product.variants[0];
  const remainingVariant = product.variants[1];
  // 4. Delete one variant
  await api.functional.shoppingMall.seller.sellers.products.variants.erase(
    sellerTokenConnection,
    {
      variantId: variantToBeDeleted.id,
    },
  );
  // 5. Fetch updated product to verify variant was deleted
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.create(
      sellerTokenConnection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(updatedProduct);
  // 6. Verify deleted variant is no longer in product
  const deletedVariantExists = updatedProduct.variants.some(
    (v) => v.id === variantToBeDeleted.id,
  );
  TestValidator.equals(
    "deleted variant not in product",
    deletedVariantExists,
    false,
  );
  // 7. Verify remaining variant is intact
  const remainingVariantExists = updatedProduct.variants.some(
    (v) => v.id === remainingVariant.id,
  );
  TestValidator.equals(
    "remaining variant still exists",
    remainingVariantExists,
    true,
  );
  // 8. Verify product still has at least one variant after deletion
  TestValidator.predicate(
    "product has at least one variant after deletion",
    updatedProduct.variants.length >= 1,
  );
}
