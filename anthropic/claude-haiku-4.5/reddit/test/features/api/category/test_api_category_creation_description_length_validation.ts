import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test description length validation for category creation.
 *
 * The test validates that the API enforces the 500-character maximum length
 * constraint for category descriptions. The system should reject descriptions
 * over 500 characters with a validation error while accepting properly-sized
 * descriptions, confirming the API enforces description length constraints.
 *
 * Steps:
 *
 * 1. Authenticate as an administrator
 * 2. Create a category with description at exactly 500-character limit
 * 3. Validate the created category matches expected data
 * 4. Attempt to create a category with description exceeding 500 characters
 *    (should fail)
 * 5. Create a category with short description under the limit
 * 6. Create a category with null description
 */
export async function test_api_category_creation_description_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com",
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category with description at exactly 500 characters
  const maxLengthDescription = RandomGenerator.alphabets(500);
  const categoryAtLimit: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `tech-${RandomGenerator.alphaNumeric(8)}`,
          description: maxLengthDescription,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryAtLimit);
  TestValidator.equals(
    "category description matches max length input",
    categoryAtLimit.description,
    maxLengthDescription,
  );

  // Step 3: Attempt to create category with description exceeding 500 characters (should fail)
  const oversizedDescription = RandomGenerator.alphabets(501);
  await TestValidator.error(
    "should reject description exceeding 500 characters",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: RandomGenerator.name(2),
            slug: `arts-${RandomGenerator.alphaNumeric(8)}`,
            description: oversizedDescription,
            display_order: 2,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 4: Create category with short description under the limit
  const shortDescription = RandomGenerator.paragraph({ sentences: 3 });
  const categoryWithShortDesc: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `sports-${RandomGenerator.alphaNumeric(8)}`,
          description: shortDescription,
          display_order: 3,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryWithShortDesc);

  // Step 5: Create category with null description
  const categoryWithNullDesc: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `music-${RandomGenerator.alphaNumeric(8)}`,
          description: null,
          display_order: 4,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryWithNullDesc);
}
