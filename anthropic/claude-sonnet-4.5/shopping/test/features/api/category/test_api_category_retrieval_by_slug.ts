import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test retrieving a product category by its unique slug identifier.
 *
 * This test validates the complete workflow of category creation and retrieval:
 *
 * 1. Admin authentication - Create and authenticate admin account for category
 *    management
 * 2. Category creation - Create a test category with all required fields
 * 3. Public category retrieval - Retrieve the category by slug (no authentication
 *    required)
 * 4. Response validation - Verify complete category data matches creation
 *
 * The test ensures that:
 *
 * - Categories can be created by administrators
 * - Categories can be retrieved using their URL-friendly slug
 * - Public endpoint works without authentication (accessible to anonymous
 *   visitors)
 * - Response includes complete category information with proper structure
 * - All properties are correctly populated (id, name, slug, description, status,
 *   etc.)
 */
export async function test_api_category_retrieval_by_slug(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a test category with all required fields
  const categorySlug = RandomGenerator.alphaNumeric(10).toLowerCase();
  const categoryName = RandomGenerator.name(2);
  const categoryDescription = RandomGenerator.paragraph({ sentences: 5 });

  const createdCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        name: categoryName,
        slug: categorySlug,
        description: categoryDescription,
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(createdCategory);

  // Step 3: Retrieve the category by slug using public endpoint (no authentication needed)
  // Create a fresh connection without authentication headers to simulate anonymous access
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  const retrievedCategory =
    await api.functional.shoppingMall.categories.getByCategoryslug(
      publicConnection,
      {
        categorySlug: categorySlug,
      },
    );
  typia.assert(retrievedCategory);

  // Step 4: Validate that retrieved category matches created category
  TestValidator.equals(
    "category ID matches",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches",
    retrievedCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category description matches",
    retrievedCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "category status matches",
    retrievedCategory.status,
    "active",
  );
  TestValidator.equals(
    "category display_order matches",
    retrievedCategory.display_order,
    createdCategory.display_order,
  );
  TestValidator.equals(
    "category product_count is initialized",
    retrievedCategory.product_count,
    0,
  );

  // Validate timestamps exist and are proper date-time strings
  typia.assert<string & tags.Format<"date-time">>(retrievedCategory.created_at);
  typia.assert<string & tags.Format<"date-time">>(retrievedCategory.updated_at);
}
