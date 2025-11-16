import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * Tests the secure and authorized deletion of a shopping mall product by an
 * authenticated admin user.
 *
 * This test performs the full lifecycle of admin registration, product
 * creation, and product deletion. It ensures that only authorized admins can
 * delete products and that the deletion effectively removes the product from
 * the system.
 *
 * Steps:
 *
 * 1. Admin user registration to establish authentication context.
 * 2. Admin creates a new shopping mall product with valid data.
 * 3. Admin deletes the created product by its unique productCode.
 * 4. Confirmation that the product is deleted by attempting to delete again
 *    (expecting no errors).
 *
 * The test validates all API responses for correctness using typia assertions
 * and checks that business rules for product deletion workflow are enforced.
 */
export async function test_api_shopping_mall_product_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "securePassword123!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create a shopping mall product
  const productCode: string = RandomGenerator.alphaNumeric(10).toUpperCase();
  const productCreateBody = {
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.shoppingMallProducts.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);
  TestValidator.equals(
    "created product code matches input",
    product.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "created product name matches input",
    product.name,
    productCreateBody.name,
  );
  TestValidator.equals(
    "created product description matches input",
    product.description,
    productCreateBody.description,
  );
  TestValidator.equals(
    "created product is_active matches input",
    product.is_active,
    productCreateBody.is_active,
  );

  // 3. Delete the product by productCode
  await api.functional.shoppingMall.admin.shoppingMallProducts.erase(
    connection,
    { productCode: product.code },
  );

  // 4. Confirm product deletion by attempting deletion again - should not throw error
  await api.functional.shoppingMall.admin.shoppingMallProducts.erase(
    connection,
    { productCode: product.code },
  );
}
