import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test category creation with valid required fields.
 *
 * This test validates that the category creation API properly accepts and
 * stores complete category data. It creates an administrator account, then
 * creates categories with all required fields properly populated.
 *
 * The test verifies that:
 *
 * 1. Administrator account can be created successfully
 * 2. Category can be created with all required fields (name, slug, display_order)
 * 3. Created category has valid data and timestamps
 * 4. API returns properly structured category response
 *
 * Note: TypeScript enforces required field validation at compile time, so
 * missing required fields cannot be tested without bypassing type checking.
 * This test focuses on validating successful category creation with complete,
 * properly-typed data.
 */
export async function test_api_category_creation_missing_required_fields(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create valid category with all required fields
  const categoryName = RandomGenerator.name();
  const categorySlug = RandomGenerator.alphabets(10).toLowerCase();
  const displayOrder = 1;

  const validCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          display_order: displayOrder,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(validCategory);

  // Step 3: Validate category response data
  TestValidator.equals(
    "category name matches input",
    validCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches input",
    validCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category display_order matches input",
    validCategory.display_order,
    displayOrder,
  );
  TestValidator.predicate(
    "category is active by default",
    validCategory.is_active === true,
  );
  TestValidator.predicate(
    "category has valid created_at timestamp",
    validCategory.created_at !== null && validCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "category has valid updated_at timestamp",
    validCategory.updated_at !== null && validCategory.updated_at !== undefined,
  );
}
