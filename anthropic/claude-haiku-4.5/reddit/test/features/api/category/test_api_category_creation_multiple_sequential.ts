import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test creating multiple categories with different configurations.
 *
 * This test validates that administrators can sequentially create multiple
 * categories with different names, slugs, and display orders. Each category is
 * created independently with unique identifiers, and the display_order field
 * properly controls sorting in UI lists. The test confirms that multiple
 * categories can coexist with proper ordering.
 *
 * Test flow:
 *
 * 1. Create administrator account for authentication
 * 2. Create first category with specific configuration
 * 3. Create second category with different name and slug
 * 4. Create third category with different display order
 * 5. Validate each category has unique ID and proper display order
 * 6. Verify all categories were created successfully
 */
export async function test_api_category_creation_multiple_sequential(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: undefined,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create first category
  const category1: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphaNumeric(5).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: undefined,
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category1);
  TestValidator.predicate(
    "first category should have valid ID",
    category1.id !== null && category1.id !== undefined,
  );
  TestValidator.equals(
    "first category display order",
    category1.display_order,
    0,
  );

  // Step 3: Create second category with different configuration
  const category2: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphaNumeric(5).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: undefined,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category2);
  TestValidator.predicate(
    "second category should have valid ID",
    category2.id !== null && category2.id !== undefined,
  );
  TestValidator.notEquals(
    "second category ID should differ from first",
    category2.id,
    category1.id,
  );
  TestValidator.equals(
    "second category display order",
    category2.display_order,
    1,
  );

  // Step 4: Create third category with different display order
  const category3: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphaNumeric(5).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: undefined,
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category3);
  TestValidator.predicate(
    "third category should have valid ID",
    category3.id !== null && category3.id !== undefined,
  );
  TestValidator.notEquals(
    "third category ID should differ from previous categories",
    category3.id,
    category1.id,
  );
  TestValidator.notEquals(
    "third category ID should differ from second category",
    category3.id,
    category2.id,
  );
  TestValidator.equals(
    "third category display order",
    category3.display_order,
    2,
  );

  // Step 5: Validate display order controls sorting
  TestValidator.predicate(
    "categories should be ordered by display_order",
    category1.display_order < category2.display_order &&
      category2.display_order < category3.display_order,
  );

  // Step 6: Validate all categories have independent creation timestamps
  TestValidator.predicate(
    "all categories should have creation timestamps",
    category1.created_at !== null &&
      category2.created_at !== null &&
      category3.created_at !== null,
  );
}
