import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that category creation requires administrator authorization.
 *
 * Verifies that only authenticated administrators with appropriate permissions
 * can create categories. This protects the platform taxonomy from being
 * modified by regular members and ensures controlled category management.
 *
 * Workflow:
 *
 * 1. Create an authenticated administrator account
 * 2. Create a new category with administrator credentials
 * 3. Validate the created category has all expected properties
 * 4. Confirm category data matches the input
 */
export async function test_api_category_creation_requires_admin(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminUsername = RandomGenerator.alphabets(12);
  const adminName = RandomGenerator.name();
  const currentUrl = "http://localhost:3000/admin/join";

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: currentUrl,
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.equals(
    "administrator email matches",
    administrator.email,
    adminEmail,
  );
  TestValidator.equals(
    "administrator username matches",
    administrator.username,
    adminUsername,
  );

  // Step 2: Create a new category with administrator credentials
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categorySlug = RandomGenerator.alphaNumeric(8).toLowerCase();
  const categoryDescription = RandomGenerator.paragraph({ sentences: 5 });
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: categoryDescription,
          display_order: displayOrder,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Validate the created category has all expected properties
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches",
    createdCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category description matches",
    createdCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "category display order matches",
    createdCategory.display_order,
    displayOrder,
  );

  // Step 4: Confirm category is active and has proper timestamps
  TestValidator.predicate("category is active", createdCategory.is_active);
  TestValidator.predicate(
    "category has valid id format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdCategory.id,
    ),
  );
  TestValidator.predicate(
    "category has created_at timestamp",
    createdCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "category has updated_at timestamp",
    createdCategory.updated_at.length > 0,
  );
}
