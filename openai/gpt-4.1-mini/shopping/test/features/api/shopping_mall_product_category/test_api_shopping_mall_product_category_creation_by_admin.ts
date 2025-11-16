import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

/**
 * Test the creation of a new shopping mall product category by an admin user.
 *
 * This test verifies that an authenticated admin user can successfully create a
 * new product category with a unique code and a descriptive name. It asserts
 * proper authentication via the admin join operation and validates that the
 * product category creation response matches the submitted data.
 *
 * Steps:
 *
 * 1. Register a new admin user via the admin join endpoint.
 * 2. Confirm that authentication token is set in the connection.
 * 3. Create a new product category with a unique code and name.
 * 4. Assert that the response data includes the submitted code and name.
 */
export async function test_api_shopping_mall_product_category_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins the platform
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminName: string = RandomGenerator.name();
  const adminPassword: string = RandomGenerator.alphaNumeric(10);
  const adminRole = "admin" as const;

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      name: adminName,
      password: adminPassword,
      phone_number: null,
      role: adminRole,
    },
  });
  typia.assert(admin);

  TestValidator.predicate(
    "admin token should be set",
    typeof connection.headers?.Authorization === "string",
  );

  // 2. Admin creates a new product category
  const categoryCode: string = RandomGenerator.alphaNumeric(8).toUpperCase();
  const categoryName: string = RandomGenerator.name();

  const category =
    await api.functional.shoppingMall.admin.shoppingMallProductCategories.create(
      connection,
      {
        body: {
          code: categoryCode,
          name: categoryName,
          description: null,
        },
      },
    );
  typia.assert(category);

  // Validate response matches input where applicable
  TestValidator.equals("category code matches", category.code, categoryCode);
  TestValidator.equals("category name matches", category.name, categoryName);
}
