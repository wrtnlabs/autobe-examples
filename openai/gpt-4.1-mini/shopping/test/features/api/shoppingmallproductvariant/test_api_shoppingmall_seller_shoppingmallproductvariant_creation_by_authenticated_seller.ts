import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shoppingmall_seller_shoppingmallproductvariant_creation_by_authenticated_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins (authentication)
  const sellerCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "ValidPass123!",
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 2. Create parent product - must provide valid category code
  // For category code, we use a random string as we don't have category creation API,
  // so we generate a random code string reasonable for test

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    brand: RandomGenerator.name(1),
    category_code: RandomGenerator.alphaNumeric(5),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  TestValidator.equals(
    "parent product code matched",
    product.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "parent product title matched",
    product.title,
    productCreateBody.title,
  );

  // 3. Create product variant using parent product's code
  const variantCreateBody = {
    shopping_mall_product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(12),
    color: RandomGenerator.name(1),
    size: RandomGenerator.alphaNumeric(2),
    option: RandomGenerator.name(2),
    price: Math.floor(Math.random() * 100000) + 1000,
    status: "available",
  } satisfies IShoppingMallProductVariant.ICreate;

  const variant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.shoppingMallProducts.shoppingMallProductVariants.create(
      connection,
      {
        productCode: product.code,
        body: variantCreateBody,
      },
    );
  typia.assert(variant);

  TestValidator.equals(
    "variant SKU code matches",
    variant.sku_code,
    variantCreateBody.sku_code,
  );
  TestValidator.equals(
    "variant product ID matches parent product ID",
    variant.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "variant color matches",
    variant.color,
    variantCreateBody.color,
  );
  TestValidator.equals(
    "variant size matches",
    variant.size,
    variantCreateBody.size,
  );
  TestValidator.equals(
    "variant option matches",
    variant.option,
    variantCreateBody.option,
  );
  TestValidator.predicate(
    "variant price reasonable",
    variant.price >= 1000 && variant.price <= 101000,
  );
  TestValidator.equals(
    "variant status matches",
    variant.status,
    variantCreateBody.status,
  );
}
