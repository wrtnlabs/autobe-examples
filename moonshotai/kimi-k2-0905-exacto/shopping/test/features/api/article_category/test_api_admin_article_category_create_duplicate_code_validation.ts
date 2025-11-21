import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";

/**
 * Test the system's handling of duplicate category codes to ensure proper
 * validation and error messaging. This test validates that the platform
 * enforces unique code constraints across all categories, prevents duplicate
 * identifier creation, and provides appropriate error responses when duplicate
 * codes are attempted.
 *
 * Test workflow:
 *
 * 1. Create administrator account for authentication
 * 2. Create initial article category with unique code
 * 3. Attempt creation of second category with duplicate code
 * 4. Verify system properly rejects duplicate code with appropriate error
 */
export async function test_api_admin_article_category_create_duplicate_code_validation(
  connection: api.IConnection,
) {
  // Create administrator account for authentication
  const adminRequest = {
    email: "admin@shopping-mall.com",
    firstname: "Admin",
    lastname: "Account",
    adminlevel: "super_admin" as const,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminRequest,
  });
  typia.assert(admin);

  // Create initial article category with unique code
  const categoryCode = "homepage-articles";
  const categoryRequest = {
    code: categoryCode,
    name: "Homepage Articles Category",
    description: "Articles intended for homepage display and featured content",
    visible: true,
    featured: true,
    metaTitle: "Homepage Articles - Shopping Mall",
    metaDescription:
      "Featured articles and content highlights for the shopping mall homepage",
  } satisfies IShoppingMallArticleCategory.ICreate;

  const firstCategory =
    await api.functional.shoppingMall.admin.articleCategories.create(
      connection,
      {
        body: categoryRequest,
      },
    );
  typia.assert(firstCategory);

  TestValidator.equals(
    "first category code matches",
    firstCategory.code,
    categoryCode,
  );
  TestValidator.equals(
    "first category name matches",
    firstCategory.name,
    categoryRequest.name,
  );
  TestValidator.equals(
    "system should accept category",
    firstCategory.code,
    categoryCode,
  );

  // Attempt to create second category with duplicate code - this should fail
  const duplicateRequest = {
    code: categoryCode, // Same code as first category
    name: "Duplicate Homepage Articles",
    description: "Different description but same code",
    visible: false,
    featured: false,
    metaTitle: "Duplicate Homepage Articles",
    metaDescription: "Different meta description",
  } satisfies IShoppingMallArticleCategory.ICreate;

  // Test that creating a category with duplicate code fails
  await TestValidator.error(
    "duplicate category code should trigger validation error",
    async () => {
      await api.functional.shoppingMall.admin.articleCategories.create(
        connection,
        {
          body: duplicateRequest,
        },
      );
    },
  );
}
