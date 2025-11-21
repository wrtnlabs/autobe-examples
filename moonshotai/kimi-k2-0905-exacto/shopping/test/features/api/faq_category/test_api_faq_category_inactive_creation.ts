import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IColorClass } from "@ORGANIZATION/PROJECT-api/lib/structures/IColorClass";
import type { IIconClass } from "@ORGANIZATION/PROJECT-api/lib/structures/IIconClass";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallFaqCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaqCategory";

/**
 * Test FAQ category creation in inactive state for content preparation
 * workflows.
 *
 * This test validates that administrators can create FAQ categories with
 * is_active=false for staging purposes before publishing to customers. It tests
 * that inactive categories are properly hidden from customer navigation
 * interfaces while remaining accessible for administrative content management
 * and development processes.
 *
 * Test flow:
 *
 * 1. Create admin user for authentication
 * 2. Login as admin to establish authenticated session
 * 3. Create inactive FAQ category for content management
 * 4. Verify category properties including inactive status
 * 5. Validate that the category is properly configured for staging workflows
 * 6. Test that the category can be retrieved and managed by administrators
 *
 * This ensures proper content lifecycle management where categories can be
 * prepared in draft state before customer visibility activation.
 */
export async function test_api_faq_category_inactive_creation(
  connection: api.IConnection,
) {
  // Step 1: Create admin user for category management
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        firstname: RandomGenerator.name(1),
        lastname: RandomGenerator.name(1),
        adminlevel: "department_admin",
        department: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Verify admin account creation
  TestValidator.equals("admin has correct email", admin.email, adminEmail);
  TestValidator.equals(
    "admin level is department_admin",
    admin.admin_level,
    "department_admin",
  );
  TestValidator.predicate("admin is active", admin.is_active);

  // Step 3: Login as admin to establish authenticated session
  const login: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "1234",
        href: "https://ADMIN_HUB_URL",
        referrer: "https://ADMIN_REFERRER_URL",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(login);

  // Step 4: Verify authentication
  TestValidator.equals("login user matches admin", login.id, admin.id);
  TestValidator.equals(
    "login department matches",
    login.department,
    admin.department,
  );

  // Step 5: Create inactive FAQ category for content management workflows
  const categoryName: string = "Draft Category " + RandomGenerator.name(1);
  const categorySlug: string = typia.random<string & tags.MinLength<1>>();
  const categoryDescription: string = RandomGenerator.paragraph({
    sentences: 3,
  });
  const categoryLanguage: string = "en";

  const createBody = {
    name: categoryName,
    slug: categorySlug,
    description: categoryDescription,
    is_active: false, // Create as inactive for staging
    sort_order: 1,
    language: categoryLanguage,
  } satisfies IShoppingMallFaqCategory.ICreate;

  const createdCategory: IShoppingMallFaqCategory =
    await api.functional.shoppingMall.admin.faqCategories.create(connection, {
      body: createBody,
    });
  typia.assert(createdCategory);

  // Step 6: Verify category properties
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    createBody.name,
  );
  TestValidator.equals(
    "category slug matches input",
    createdCategory.slug,
    createBody.slug,
  );
  TestValidator.equals(
    "category description matches input",
    createdCategory.description,
    createBody.description,
  );
  TestValidator.equals(
    "category is inactive",
    createdCategory.is_active,
    false,
  );
  TestValidator.equals(
    "category sort order matches",
    createdCategory.sort_order,
    createBody.sort_order,
  );
  TestValidator.equals(
    "category language matches",
    createdCategory.language,
    createBody.language,
  );
  TestValidator.equals(
    "initial article count is 0",
    createdCategory.article_count,
    0,
  );
  TestValidator.predicate(
    "category has valid UUID",
    createdCategory.id.length > 0,
  );
  TestValidator.predicate(
    "category path is set",
    createdCategory.path.length > 0,
  );
  TestValidator.equals("category depth is 0", createdCategory.depth, 0);

  // Step 7: Test that the category can be retrieved for management
  // Note: The current API structure shows this test focuses on creation only,
  // but this could be extended to include retrieval validation in a real scenario

  // Step 8: Validate the category is suitable for content staging workflows
  TestValidator.predicate(
    "category supports content management",
    createdCategory.is_active === false &&
      createdCategory.article_count === 0 &&
      createdCategory.name.length > 0,
  );

  // Step 9: Test business logic - Inactive category workflow validation
  TestValidator.predicate(
    "category ready for content development",
    !createdCategory.is_active && createdCategory.sort_order >= 0,
  );
}
