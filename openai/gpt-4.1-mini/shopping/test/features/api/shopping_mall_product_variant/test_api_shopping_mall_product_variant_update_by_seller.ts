import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_product_variant_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller sign-up
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "securePass1234",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);
  TestValidator.predicate(
    "Seller authorization token exists",
    typeof seller.token.access === "string" && seller.token.access.length > 0,
  );

  // 2. Create a new shopping mall product
  const productCode: string = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    code: productCode,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 5,
      wordMax: 15,
    }),
    brand: RandomGenerator.name(2),
    category_code: "cat0001",
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
    "Product created code matches",
    product.code,
    productCode,
  );

  // 3. Create a product variant
  const initialSkuCode: string = RandomGenerator.alphaNumeric(10);
  const productVariantCreateBody = {
    shopping_mall_product_id: product.id,
    sku_code: initialSkuCode,
    color: RandomGenerator.pick([
      "red",
      "blue",
      "green",
      "black",
      "white",
    ] as const),
    size: RandomGenerator.pick(["S", "M", "L", "XL", "XXL"] as const),
    option: RandomGenerator.name(1),
    price: 9999,
    status: "active",
  } satisfies IShoppingMallProductVariant.ICreate;
  const productVariant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.shoppingMallProducts.shoppingMallProductVariants.create(
      connection,
      {
        productCode: product.code,
        body: productVariantCreateBody,
      },
    );
  typia.assert(productVariant);
  TestValidator.equals(
    "Product variant SKU code matches",
    productVariant.sku_code,
    initialSkuCode,
  );

  // 4. Update the product variant
  const updatedPrice: number = 10999;
  const updateBody = {
    color: RandomGenerator.pick(["yellow", "purple", "gray", "white"] as const),
    size: RandomGenerator.pick(["XS", "XXL", "XXXL"] as const),
    option: RandomGenerator.name(2),
    price: updatedPrice,
    status: "inactive",
  } satisfies IShoppingMallProductVariant.IUpdate;
  const updatedVariant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.shoppingMallProducts.shoppingMallProductVariants.update(
      connection,
      {
        productCode: product.code,
        skuCode: productVariant.sku_code,
        body: updateBody,
      },
    );
  typia.assert(updatedVariant);

  // Validations
  TestValidator.equals(
    "Updated product variant color",
    updatedVariant.color,
    updateBody.color,
  );
  TestValidator.equals(
    "Updated product variant size",
    updatedVariant.size,
    updateBody.size,
  );
  TestValidator.equals(
    "Updated product variant option",
    updatedVariant.option,
    updateBody.option,
  );
  TestValidator.equals(
    "Updated product variant price",
    updatedVariant.price,
    updateBody.price,
  );
  TestValidator.equals(
    "Updated product variant status",
    updatedVariant.status,
    updateBody.status,
  );
}
