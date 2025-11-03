import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Test that an admin can register, create a product, and retrieve its detail by
 * productCode.
 *
 * 1. Admin joins with valid credentials.
 * 2. Admin creates a product with unique code, name, description, and brand.
 * 3. Admin retrieves the product by its productCode.
 * 4. Validates the returned product data deeply with typia.assert and field
 *    equality checks.
 */
export async function test_api_product_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "securePassword123",
    full_name: "Admin User",
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Admin creates a product
  // Use unique code that is alphanumeric with length approx 10
  const productCode: string = ("PROD-" + RandomGenerator.alphaNumeric(6)).slice(
    0,
    20,
  );

  const productCreateBody = {
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 7,
    }),
    brand: RandomGenerator.name(2),
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(createdProduct);

  // 3. Retrieve product by productCode
  const retrievedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.at(connection, {
      productCode: createdProduct.code,
    });
  typia.assert(retrievedProduct);

  // 4. Validate retrieved product fields match created product
  TestValidator.equals(
    "product code matches",
    retrievedProduct.code,
    createdProduct.code,
  );
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    createdProduct.name,
  );
  TestValidator.equals(
    "product description matches",
    retrievedProduct.description,
    createdProduct.description,
  );
  TestValidator.equals(
    "product brand matches",
    retrievedProduct.brand,
    createdProduct.brand,
  );
}
