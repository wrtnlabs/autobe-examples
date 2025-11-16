import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the ability for an authenticated admin to assign a new category to
 * an existing product.
 *
 * 1. Admin user registers with valid unique credentials.
 * 2. Admin assigns a new category (random UUID for product/category) to a product
 *    using admin endpoint.
 * 3. The response is validated to be a proper mapping with correct product and
 *    category context.
 * 4. Assert that the assigned product/category are reflected as expected.
 */
export async function test_api_product_category_assignment_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin email should match",
    adminAuth.email,
    adminBody.email,
  );
  TestValidator.predicate(
    "admin id is uuid",
    typeof adminAuth.id === "string" && adminAuth.id.length > 0,
  );

  // Step 2: Assign a random category to a random product
  const productId = typia.random<string & tags.Format<"uuid">>();
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const assignResult: IShoppingMallProductsCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId,
        body: {
          shopping_mall_category_id: categoryId,
        } satisfies IShoppingMallProductsCategory.ICreate,
      },
    );
  typia.assert(assignResult);

  // Step 3: Validate the mapping response
  TestValidator.equals(
    "product id in mapping matches",
    assignResult.product.id,
    productId,
  );
  TestValidator.equals(
    "category id in mapping matches",
    assignResult.category.id,
    categoryId,
  );
  TestValidator.predicate(
    "mapping id is uuid",
    typeof assignResult.id === "string" && assignResult.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is non-empty",
    typeof assignResult.created_at === "string" &&
      assignResult.created_at.length > 0,
  );
}
