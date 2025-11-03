import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * End-to-end test for product detail retrieval by a customer.
 *
 * This test covers multiple aspects:
 *
 * - Customer and admin account registration (join) and authentication (login)
 * - Admin creating a product in the shopping mall catalog
 * - Customer retrieving the product details by unique productCode
 *
 * The test validates:
 *
 * - Correct issuance of authorization tokens on join/login
 * - Successful creation of product by admin
 * - Accurate, complete, and consistent product data retrieved by customer
 * - The product is active (not deleted) and attributes match creation input
 *
 * This ensures that the authorization, product management, and public catalog
 * accessibility features work correctly in concert.
 */
export async function test_api_product_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Step 1. Customer joins
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customerAuthorized);

  // Step 2. Customer login
  const customerLoginBody = {
    email: customerCreateBody.email,
    password: customerCreateBody.password,
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // Step 3. Admin joins
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // Step 4. Admin login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
    href: "https://example.com/admin/login",
    referrer: "https://example.com",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // Step 5. Admin creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 7,
      wordMin: 4,
      wordMax: 8,
    }),
    brand: RandomGenerator.name(2),
  } satisfies IShoppingMallProduct.ICreate;
  const productCreated: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(productCreated);

  // Step 6. Customer retrieves product detail by product code
  const productRetrieved: IShoppingMallProduct =
    await api.functional.shoppingMall.customer.products.at(connection, {
      productCode: productCreated.code,
    });
  typia.assert(productRetrieved);

  // Validations
  TestValidator.equals(
    "product id should match",
    productRetrieved.id,
    productCreated.id,
  );
  TestValidator.equals(
    "product code should match",
    productRetrieved.code,
    productCreated.code,
  );
  TestValidator.equals(
    "product name should match",
    productRetrieved.name,
    productCreated.name,
  );
  TestValidator.equals(
    "product description should match",
    productRetrieved.description ?? null,
    productCreated.description ?? null,
  );
  TestValidator.equals(
    "product brand should match",
    productRetrieved.brand ?? null,
    productCreated.brand ?? null,
  );
  TestValidator.predicate(
    "product should not be deleted",
    productRetrieved.deleted_at === null ||
      productRetrieved.deleted_at === undefined,
  );
}
