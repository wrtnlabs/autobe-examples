import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test retrieving a product category by its unique code identifier.
 *
 * This test validates that category information can be successfully retrieved
 * using the category code (slug) path parameter. The scenario creates a new
 * category with complete details and then retrieves it by code to verify all
 * fields are correctly returned.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to create test data
 * 2. Create a new category with complete information
 * 3. Retrieve the category by its code using the public endpoint
 * 4. Validate all fields match the created category
 */
export async function test_api_category_retrieval_by_code(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to create category
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a test category with complete details
  const categorySlug = RandomGenerator.alphabets(10);
  const categoryData = {
    parent_id: null,
    name: RandomGenerator.name(2),
    slug: categorySlug,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: RandomGenerator.pick(["active", "inactive"] as const),
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(createdCategory);

  // Step 3: Retrieve the category by code using public endpoint
  const retrievedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.categories.getByCategorycode(connection, {
      categoryCode: categorySlug,
    });
  typia.assert(retrievedCategory);

  // Step 4: Validate retrieved category matches created category
  TestValidator.equals(
    "category ID matches",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category slug matches",
    retrievedCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category description matches",
    retrievedCategory.description,
    categoryData.description,
  );
  TestValidator.equals(
    "category image_url matches",
    retrievedCategory.image_url,
    categoryData.image_url,
  );
  TestValidator.equals(
    "category display_order matches",
    retrievedCategory.display_order,
    categoryData.display_order,
  );
  TestValidator.equals(
    "category status matches",
    retrievedCategory.status,
    categoryData.status,
  );
  TestValidator.equals(
    "category parent_id is null",
    retrievedCategory.parent_id,
    null,
  );
  TestValidator.equals(
    "product_count initialized to 0",
    retrievedCategory.product_count,
    0,
  );

  // Validate timestamps exist and are properly formatted
  TestValidator.predicate(
    "created_at exists",
    retrievedCategory.created_at !== null &&
      retrievedCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedCategory.updated_at !== null &&
      retrievedCategory.updated_at !== undefined,
  );
}
