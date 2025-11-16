import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that category creation automatically generates system fields.
 *
 * Verifies that the API correctly generates and assigns auto-generated fields
 * when creating a new category. System fields (id, is_active, created_at,
 * updated_at) should be automatically assigned by the server and not
 * overridable by client request.
 *
 * Prerequisites:
 *
 * 1. Administrator account creation for authentication
 *
 * Test workflow:
 *
 * 1. Create administrator account
 * 2. Create a category with user-provided fields only
 * 3. Validate all fields including auto-generated ones
 * 4. Verify is_active is true
 * 5. Verify created_at and updated_at timestamps are equal at creation
 * 6. Verify user-provided fields are correctly stored
 */
export async function test_api_category_creation_auto_generated_fields(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphabets(15),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/categories",
        referrer: "http://localhost:3000/admin",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category with user-provided fields only
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categorySlug = RandomGenerator.alphabets(10).toLowerCase();
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
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

  // Step 3: Validate is_active is automatically set to true
  TestValidator.equals(
    "is_active should be true for newly created category",
    createdCategory.is_active,
    true,
  );

  // Step 4: Validate created_at and updated_at are equal (both set at creation time)
  TestValidator.equals(
    "created_at and updated_at should be equal at creation",
    createdCategory.created_at,
    createdCategory.updated_at,
  );

  // Step 5: Verify user-provided fields are correctly stored
  TestValidator.equals(
    "category name should match input",
    createdCategory.name,
    categoryName,
  );

  TestValidator.equals(
    "category slug should match input",
    createdCategory.slug,
    categorySlug,
  );

  TestValidator.equals(
    "category description should match input",
    createdCategory.description,
    categoryDescription,
  );

  TestValidator.equals(
    "category display_order should match input",
    createdCategory.display_order,
    displayOrder,
  );
}
