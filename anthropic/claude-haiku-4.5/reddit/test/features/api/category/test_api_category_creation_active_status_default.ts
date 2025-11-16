import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates that newly created categories are marked as active by default.
 *
 * When an administrator creates a new category on the platform, the category
 * should be immediately available for community assignment without requiring a
 * separate activation step. This test verifies that the is_active field is
 * automatically set to true when a category is created.
 *
 * Steps:
 *
 * 1. Administrator joins the platform
 * 2. Administrator creates a new category with required fields
 * 3. Validate that the created category has is_active set to true
 * 4. Confirm the category is ready for immediate use
 */
export async function test_api_category_creation_active_status_default(
  connection: api.IConnection,
) {
  // 1. Administrator joins the platform
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(8),
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Administrator creates a new category with required fields
  const categoryName: string = RandomGenerator.name(2);
  const categorySlug: string = categoryName.toLowerCase().replace(/\s+/g, "-");

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: undefined,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // 3. Validate that the created category has is_active set to true
  TestValidator.equals(
    "created category should be active by default",
    createdCategory.is_active,
    true,
  );

  // 4. Confirm the category is ready for immediate use
  TestValidator.predicate(
    "category should have valid UUID identifier",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdCategory.id,
    ),
  );

  TestValidator.predicate(
    "category should have non-empty name",
    createdCategory.name.length > 0,
  );

  TestValidator.predicate(
    "category should have non-empty slug",
    createdCategory.slug.length > 0,
  );

  TestValidator.predicate(
    "category should have valid timestamps",
    createdCategory.created_at !== null && createdCategory.updated_at !== null,
  );
}
