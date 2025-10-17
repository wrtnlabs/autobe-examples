import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * End-to-end test function to validate product creation by an authenticated
 * seller.
 *
 * This test will perform the following steps:
 *
 * 1. Authenticate an admin user and create a product category.
 * 2. Create a seller entity via admin APIs.
 * 3. Authenticate as the created seller and login.
 * 4. Use the authenticated seller session to create a new product referencing the
 *    previously created seller and category.
 * 5. Validate the created product's properties to match the input data.
 *
 * Each step includes typia type assertion for full runtime validation and
 * descriptive test assertions to verify correctness. This workflow ensures that
 * the system supports proper category and seller association and that product
 * creation by sellers is functional and secure.
 */
export async function test_api_product_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Admin joins (sign up) and gets authorized token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Admin creates product category
  const categoryCreateBody = {
    code: `CAT-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    parent_id: null,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category.code matches input",
    category.code,
    categoryCreateBody.code,
  );
  TestValidator.equals(
    "category.name matches input",
    category.name,
    categoryCreateBody.name,
  );
  TestValidator.equals(
    "category.description matches input",
    category.description,
    categoryCreateBody.description,
  );

  // 3. Admin creates seller entity
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "SellerPass123!",
    company_name: RandomGenerator.name(2),
    contact_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);
  TestValidator.equals(
    "seller.email matches input",
    seller.email,
    sellerCreateBody.email,
  );

  // 4. Seller joins (sign up)
  const sellerJoinBody = {
    email: sellerCreateBody.email,
    password_hash: sellerCreateBody.password_hash,
    company_name: sellerCreateBody.company_name,
    contact_name: sellerCreateBody.contact_name,
    phone_number: sellerCreateBody.phone_number,
    status: sellerCreateBody.status,
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);
  TestValidator.equals(
    "seller join email matches",
    sellerAuthorized.email,
    sellerCreateBody.email,
  );

  // 5. Seller logs in
  const sellerLoginBody = {
    email: sellerCreateBody.email,
    password: sellerCreateBody.password_hash,
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);
  TestValidator.equals(
    "seller login email matches",
    sellerLoggedIn.email,
    sellerCreateBody.email,
  );

  // 6. Seller creates product with category and seller IDs
  const productCode = `PROD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const productCreateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: seller.id,
    code: productCode,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 3,
      wordMax: 7,
    }),
    status: "Draft",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product category ID matches input",
    product.shopping_mall_category_id,
    productCreateBody.shopping_mall_category_id,
  );
  TestValidator.equals(
    "product seller ID matches input",
    product.shopping_mall_seller_id,
    productCreateBody.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "product code matches input",
    product.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "product name matches input",
    product.name,
    productCreateBody.name,
  );
  TestValidator.equals(
    "product description matches input",
    product.description,
    productCreateBody.description,
  );
  TestValidator.equals(
    "product status matches input",
    product.status,
    productCreateBody.status,
  );
}
