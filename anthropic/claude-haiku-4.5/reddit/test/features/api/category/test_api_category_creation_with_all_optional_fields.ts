import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test category creation providing all optional fields along with required
 * fields.
 *
 * This test validates that when creating a community platform category with all
 * available properties (name, slug, description, and icon_url), the API
 * correctly persists all fields and returns them in the response. The test
 * ensures that optional fields like description and icon_url are properly
 * stored and retrievable, confirming the system handles complete category
 * objects with all metadata needed for UI display and community creation
 * workflows.
 *
 * Test flow:
 *
 * 1. Create administrator account with valid credentials
 * 2. Create category with all required fields (name, slug, display_order)
 * 3. Create category with all fields including optional description and icon_url
 * 4. Validate that all provided fields are correctly stored and returned
 * 5. Verify response includes auto-generated id, timestamps, and is_active status
 */
export async function test_api_category_creation_with_all_optional_fields(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category with all optional fields
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categorySlug = RandomGenerator.alphabets(10).toLowerCase();
  const categoryDescription = RandomGenerator.paragraph({ sentences: 5 });
  const categoryIconUrl = typia.random<string & tags.Format<"uri">>();
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
          icon_url: categoryIconUrl,
          display_order: displayOrder,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );

  typia.assert(createdCategory);

  // Step 3: Validate all provided fields are correctly stored and returned
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches input",
    createdCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category description matches input",
    createdCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "category icon_url matches input",
    createdCategory.icon_url,
    categoryIconUrl,
  );
  TestValidator.equals(
    "category display_order matches input",
    createdCategory.display_order,
    displayOrder,
  );
}
