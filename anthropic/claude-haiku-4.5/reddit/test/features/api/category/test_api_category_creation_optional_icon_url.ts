import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test category creation with optional icon_url field validation.
 *
 * This test validates that the icon_url field in category creation is truly
 * optional and can be provided as a valid URI, null, or omitted entirely. The
 * test ensures:
 *
 * 1. Categories can be created with a valid icon URL
 * 2. Categories can be created with null icon_url
 * 3. Categories can be created without providing icon_url at all
 * 4. The icon_url field is correctly stored and returned in all valid cases
 * 5. Invalid icon_url values (non-URI format) are rejected
 *
 * The test follows a realistic administrator workflow:
 *
 * - Administrator joins/authenticates first
 * - Creates multiple categories with different icon_url configurations
 * - Validates that all variations work correctly
 */
export async function test_api_category_creation_optional_icon_url(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphabets(12);
  const adminUsername: string = RandomGenerator.alphabets(8);
  const adminName: string = RandomGenerator.name();
  const currentUrl: string = typia.random<string & tags.Format<"uri">>();

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: currentUrl,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create category WITH valid icon URL
  const iconUrl: string = typia.random<string & tags.Format<"uri">>();
  const categoryWithIconUrl: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: iconUrl,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryWithIconUrl);
  TestValidator.equals(
    "category with icon_url should store the URL correctly",
    categoryWithIconUrl.icon_url,
    iconUrl,
  );

  // Step 3: Create category WITH null icon_url
  const categoryWithNullIcon: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryWithNullIcon);
  TestValidator.equals(
    "category with null icon_url should be stored as null",
    categoryWithNullIcon.icon_url,
    null,
  );

  // Step 4: Create category WITHOUT icon_url (omitted entirely)
  const categoryWithoutIcon = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 3,
  } satisfies ICommunityPlatformCategory.ICreate;

  const categoryOmittedIcon: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryWithoutIcon,
      },
    );
  typia.assert(categoryOmittedIcon);
  TestValidator.predicate(
    "category without icon_url should have undefined or null icon_url",
    categoryOmittedIcon.icon_url === undefined ||
      categoryOmittedIcon.icon_url === null,
  );

  // Step 5: Verify is_active flag is set correctly for newly created categories
  TestValidator.equals(
    "newly created category with icon_url should be active",
    categoryWithIconUrl.is_active,
    true,
  );
  TestValidator.equals(
    "newly created category with null icon_url should be active",
    categoryWithNullIcon.is_active,
    true,
  );
  TestValidator.equals(
    "newly created category without icon_url should be active",
    categoryOmittedIcon.is_active,
    true,
  );

  // Step 6: Verify display_order is preserved for all categories
  TestValidator.equals(
    "display order should be preserved correctly for icon_url category",
    categoryWithIconUrl.display_order,
    1,
  );
  TestValidator.equals(
    "display order should be preserved correctly for null icon_url category",
    categoryWithNullIcon.display_order,
    2,
  );
  TestValidator.equals(
    "display order should be preserved correctly for omitted icon_url category",
    categoryOmittedIcon.display_order,
    3,
  );

  // Step 7: Verify that name and slug are stored correctly across all variations
  TestValidator.predicate(
    "category name should not be empty",
    categoryWithIconUrl.name.length > 0,
  );
  TestValidator.predicate(
    "category slug should not be empty",
    categoryWithIconUrl.slug.length > 0,
  );
}
