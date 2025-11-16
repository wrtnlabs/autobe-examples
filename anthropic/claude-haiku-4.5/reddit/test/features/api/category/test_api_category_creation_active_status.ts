import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that newly created categories are automatically marked as active
 * (is_active=true).
 *
 * Validates the category creation workflow ensuring that:
 *
 * 1. Administrator authentication is established
 * 2. New categories are created with proper metadata (name, slug, display_order)
 * 3. Newly created categories are automatically marked as active
 * 4. The response includes the is_active field with value true
 * 5. Category timestamps are properly recorded (created_at, updated_at)
 *
 * This test ensures that active categories are immediately available in the
 * platform's category selection system and that the system properly tracks
 * category activation state.
 */
export async function test_api_category_creation_active_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a new category
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categorySlug = RandomGenerator.alphabets(8).toLowerCase();
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
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
          display_order: displayOrder,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Verify the created category is marked as active
  TestValidator.predicate(
    "created category should be marked as active",
    createdCategory.is_active === true,
  );

  // Step 4: Verify the response includes all required fields
  TestValidator.equals(
    "category id should be UUID format",
    typeof createdCategory.id,
    "string",
  );
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
    "category display order matches",
    createdCategory.display_order,
    displayOrder,
  );
  TestValidator.predicate(
    "category should have created_at timestamp",
    createdCategory.created_at !== null &&
      createdCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "category should have updated_at timestamp",
    createdCategory.updated_at !== null &&
      createdCategory.updated_at !== undefined,
  );

  // Step 5: Verify timestamps are in ISO 8601 format
  TestValidator.predicate(
    "created_at should be valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdCategory.created_at),
  );
  TestValidator.predicate(
    "updated_at should be valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdCategory.updated_at),
  );

  // Step 6: Verify the category is properly activated in the system
  TestValidator.equals(
    "is_active flag explicitly true",
    createdCategory.is_active,
    true,
  );
}
