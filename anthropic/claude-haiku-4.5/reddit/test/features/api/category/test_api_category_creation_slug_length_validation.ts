import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test slug length validation for category creation.
 *
 * This test validates that the category creation API properly enforces slug
 * length constraints. The slug field must be between 1 and 255 characters,
 * containing only lowercase alphanumeric characters and hyphens. The test
 * covers:
 *
 * 1. Creating a category with a valid slug length (within 1-255 range)
 * 2. Attempting to create categories with invalid slug lengths:
 *
 *    - Empty slug (0 characters) - should be rejected
 *    - Slug exceeding 255 characters - should be rejected
 * 3. Validating the successfully created category has correct properties
 *
 * The test ensures the API enforces slug length validation and rejects invalid
 * inputs while accepting valid category data.
 */
export async function test_api_category_creation_slug_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .toLowerCase()
          .substring(0, 50) as string & tags.Format<"email">,
        password:
          RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(4),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category with valid slug length
  const validSlug = "valid-category-slug";
  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: validSlug,
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "created category slug matches",
    createdCategory.slug,
    validSlug,
  );

  // Step 3: Test with empty slug (0 characters) - should fail
  await TestValidator.error("empty slug should be rejected", async () => {
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: "",
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  });

  // Step 4: Test with slug exceeding 255 characters - should fail
  const tooLongSlug = "a-" + RandomGenerator.alphabets(253);
  await TestValidator.error(
    "slug exceeding 255 characters should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: RandomGenerator.name(),
            slug: tooLongSlug,
            display_order: 3,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 5: Test with single character slug (minimum valid length)
  const singleCharSlug = "a";
  const minLengthCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: singleCharSlug,
          display_order: 4,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(minLengthCategory);
  TestValidator.equals(
    "minimum length slug matches",
    minLengthCategory.slug,
    singleCharSlug,
  );

  // Step 6: Test with maximum valid length slug (255 characters)
  const maxLengthSlug = "a-" + RandomGenerator.alphabets(252);
  const maxLengthCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: maxLengthSlug,
          display_order: 5,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(maxLengthCategory);
  TestValidator.equals(
    "maximum length slug matches",
    maxLengthCategory.slug,
    maxLengthSlug,
  );
}
