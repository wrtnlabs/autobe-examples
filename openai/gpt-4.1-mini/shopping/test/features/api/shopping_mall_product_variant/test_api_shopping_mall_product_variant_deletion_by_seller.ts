import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_product_variant_deletion_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins and authenticates
  const sellerBody = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@test.com`,
    password: "1234",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerBody });
  typia.assert(seller);

  // 2. Create a product
  const productBody = {
    code: `prod-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    brand: RandomGenerator.name(1),
    category_code: typia.random<string>(), // category_code has no explicit info - use random string
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  // 3. Create a product variant SKU
  const variantBody = {
    shopping_mall_product_id: product.id,
    sku_code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    color: "red",
    size: "M",
    option: null,
    price: 100,
    status: "in stock",
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.shoppingMallProducts.shoppingMallProductVariants.create(
      connection,
      {
        productCode: product.code,
        body: variantBody,
      },
    );
  typia.assert(variant);

  // 4. Delete the created product variant SKU
  await api.functional.shoppingMall.seller.shoppingMallProducts.shoppingMallProductVariants.erase(
    connection,
    {
      productCode: product.code,
      skuCode: variant.sku_code,
    },
  );
}
