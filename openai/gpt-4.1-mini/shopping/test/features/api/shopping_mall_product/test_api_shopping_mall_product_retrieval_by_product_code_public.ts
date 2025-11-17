import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_product_retrieval_by_product_code_public(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform to obtain authentication
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "1234",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller creates a shopping mall product with mandatory fields
  const categoryCode: string = "cat-1234"; // Since category_code needs to be valid, but no category create API is given, use fixed code
  // For robust test, generate code unique
  const productCode: string = `PROD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const productTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  const productDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 9,
  });
  const productBrand = RandomGenerator.name(2);

  const createBody = {
    code: productCode,
    title: productTitle,
    description: productDescription,
    brand: productBrand,
    category_code: categoryCode,
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdProduct);

  // 3. Public retrieval by productCode
  const retrievedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.shoppingMallProducts.at(connection, {
      productCode: productCode,
    });
  typia.assert(retrievedProduct);

  // Validate retrieved product values against created product
  TestValidator.equals(
    "retrieved product code matches",
    retrievedProduct.code,
    createdProduct.code,
  );
  TestValidator.equals(
    "retrieved product title matches",
    retrievedProduct.title,
    createdProduct.title,
  );
  TestValidator.equals(
    "retrieved product description matches",
    retrievedProduct.description,
    createdProduct.description,
  );
  TestValidator.equals(
    "retrieved product brand matches",
    retrievedProduct.brand,
    createdProduct.brand,
  );
  TestValidator.equals(
    "retrieved product category id matches",
    retrievedProduct.shopping_mall_category.id,
    createdProduct.shopping_mall_category.id,
  );
  TestValidator.equals(
    "retrieved product category name matches",
    retrievedProduct.shopping_mall_category.name,
    createdProduct.shopping_mall_category.name,
  );

  // 4. Test behavior with a non-existent productCode - expect error
  const nonexistentCode = `NONEXISTENT-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  await TestValidator.error(
    "retrieving non-existent product code throws",
    async () => {
      await api.functional.shoppingMall.shoppingMallProducts.at(connection, {
        productCode: nonexistentCode,
      });
    },
  );
}
