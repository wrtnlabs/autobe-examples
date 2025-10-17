import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate retrieval of detailed product category information.
 *
 * This test covers the public retrieval of a product category by its unique
 * identifier without authorization. It first authenticates and creates an admin
 * user who then creates a root product category as prerequisite data.
 *
 * It verifies that the retrieved category matches the expected details,
 * including code, name, hierarchical parent linkage (null parent_id for root),
 * and timestamps. It asserts full type safety of responses using typia.assert.
 *
 * Steps:
 *
 * 1. Admin joins the system with valid email, password, status.
 * 2. Admin creates root category with code, name, display_order, parent_id null.
 * 3. Public API call retrieves category by ID and validates response structure.
 */
export async function test_api_category_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Authenticate Admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(16);
  const adminCreate = {
    email: adminEmail,
    password_hash: adminPasswordHash,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(adminAuthorized);

  // 2. Admin creates root category
  const rootCategoryCreate = {
    parent_id: null,
    code: RandomGenerator.alphabets(5).toUpperCase(),
    name: RandomGenerator.name(1),
    description: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >() satisfies number as number,
  } satisfies IShoppingMallCategory.ICreate;

  const rootCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      { body: rootCategoryCreate },
    );

  typia.assert(rootCategory);

  // 3. Public API retrieves category details without auth
  // Use unauthenticated connection by cloning and clearing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const categoryDetails: IShoppingMallCategory =
    await api.functional.shoppingMall.shoppingMall.categories.at(unauthConn, {
      categoryId: rootCategory.id,
    });
  typia.assert(categoryDetails);

  // Validate values
  TestValidator.equals(
    "category ID matches",
    categoryDetails.id,
    rootCategory.id,
  );
  TestValidator.equals(
    "category code matches",
    categoryDetails.code,
    rootCategory.code,
  );
  TestValidator.equals(
    "category name matches",
    categoryDetails.name,
    rootCategory.name,
  );
  TestValidator.equals(
    "category parent_id is null for root",
    categoryDetails.parent_id,
    null,
  );
  TestValidator.equals(
    "category description matches",
    categoryDetails.description,
    rootCategoryCreate.description,
  );
  TestValidator.equals(
    "category display_order matches",
    categoryDetails.display_order,
    rootCategoryCreate.display_order,
  );
  TestValidator.equals(
    "category created_at is defined",
    categoryDetails.created_at !== undefined &&
      categoryDetails.created_at !== null,
    true,
  );
  TestValidator.equals(
    "category updated_at is defined",
    categoryDetails.updated_at !== undefined &&
      categoryDetails.updated_at !== null,
    true,
  );
  TestValidator.equals(
    "category deleted_at is null for active",
    categoryDetails.deleted_at,
    null,
  );
}
