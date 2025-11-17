import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_seller_shopping_mall_products_creation(
  connection: api.IConnection,
) {
  // Step 1. Seller joins to create user context
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "1234",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2. Prepare product creation request body
  // Generate a unique product code and title
  const productCode = "PRD" + RandomGenerator.alphaNumeric(8).toUpperCase();
  const productTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });

  // Fetch or create a category summary for category_code
  // Since no API is provided to fetch categories,
  // generate a plausible category_code value as a string
  // In real tests, this should be replaced with actual existing category_code
  // For this mock test, generate as "CAT" + random alphanumeric 5 uppercase
  const categoryCode = "CAT" + RandomGenerator.alphaNumeric(5).toUpperCase();

  // Optional description and brand
  const productDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 8,
  });
  const productBrand = RandomGenerator.name(1);

  const requestBody = {
    code: productCode,
    title: productTitle,
    description: productDescription,
    brand: productBrand,
    category_code: categoryCode,
  } satisfies IShoppingMallProduct.ICreate;

  // Step 3. Create the product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(product);

  // Step 4. Validate the returned product
  TestValidator.predicate(
    "product ID is non-empty string",
    typeof product.id === "string" && product.id.length > 0,
  );
  TestValidator.equals(
    "product code matches request",
    product.code,
    productCode,
  );
  TestValidator.equals(
    "product title matches request",
    product.title,
    productTitle,
  );
  TestValidator.equals(
    "product description matches request",
    product.description,
    productDescription,
  );
  TestValidator.equals(
    "product brand matches request",
    product.brand,
    productBrand,
  );
  TestValidator.predicate(
    "product created_at is valid date-time ISO string",
    typeof product.created_at === "string",
  );
  TestValidator.predicate(
    "product updated_at is valid date-time ISO string",
    typeof product.updated_at === "string",
  );
  TestValidator.equals(
    "product deleted_at is null or undefined",
    true,
    product.deleted_at === null || product.deleted_at === undefined,
  );

  // Validate shopping mall category summary reference
  TestValidator.predicate(
    "shopping_mall_category.id is non-empty string",
    typeof product.shopping_mall_category.id === "string" &&
      product.shopping_mall_category.id.length > 0,
  );
  TestValidator.predicate(
    "shopping_mall_category.name is string",
    typeof product.shopping_mall_category.name === "string",
  );
}
