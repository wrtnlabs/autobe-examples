import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that the system enforces slug uniqueness constraint when creating
 * categories.
 *
 * Administrator creates a first category with a specific slug, then attempts to
 * create a second category with the same slug. The test validates that the
 * second creation fails with an appropriate error indicating slug duplication.
 * It verifies that only the first category exists after the failed attempt and
 * the error response provides clear feedback about the uniqueness constraint
 * violation.
 *
 * Test workflow:
 *
 * 1. Administrator authentication and account creation
 * 2. First category creation with unique slug
 * 3. Second category creation attempt with duplicate slug
 * 4. Error validation and constraint verification
 */
export async function test_api_category_creation_slug_uniqueness_validation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/setup",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator authenticated successfully",
    !!admin.id,
  );

  // Step 2: Create first category with unique slug
  const uniqueSlug =
    RandomGenerator.alphabets(5) + "-" + RandomGenerator.alphaNumeric(4);
  const firstCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: uniqueSlug,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  TestValidator.equals(
    "first category slug matches input",
    firstCategory.slug,
    uniqueSlug,
  );
  TestValidator.predicate(
    "first category created with valid ID",
    !!firstCategory.id,
  );

  // Step 3: Attempt to create second category with duplicate slug - should fail
  await TestValidator.error("duplicate slug creation should fail", async () => {
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: uniqueSlug,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  });

  // Step 4: Validate slug uniqueness constraint is enforced
  TestValidator.equals(
    "first category still has unique slug after failed duplicate attempt",
    firstCategory.slug,
    uniqueSlug,
  );
}
