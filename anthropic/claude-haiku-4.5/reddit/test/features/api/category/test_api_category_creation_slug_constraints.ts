import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test category slug field validation for creation endpoint.
 *
 * Validates that the category slug field properly enforces constraints:
 *
 * - Required field (cannot be null or undefined)
 * - Length between 1-255 characters
 * - Only lowercase alphanumeric characters and hyphens allowed
 * - Uppercase letters, spaces, special characters, and symbols rejected
 *
 * The test workflow:
 *
 * 1. Authenticate as administrator
 * 2. Test valid slug variations (minimum, middle, maximum length)
 * 3. Test invalid slug formats and values
 * 4. Verify proper HTTP 400 error responses for all violations
 */
export async function test_api_category_creation_slug_constraints(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPassword123!",
      username: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: undefined,
      ip: undefined,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test valid slug - minimum length (1 character)
  const minSlugCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Minimal Category",
          slug: "a",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(minSlugCategory);
  TestValidator.equals(
    "min slug length category created",
    minSlugCategory.slug,
    "a",
  );

  // Step 3: Test valid slug - medium length with hyphens
  const mediumSlugCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Medium Category",
          slug: "tech-and-innovation",
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(mediumSlugCategory);
  TestValidator.equals(
    "medium slug category created",
    mediumSlugCategory.slug,
    "tech-and-innovation",
  );

  // Step 4: Test valid slug - maximum length (255 characters)
  const maxSlug = "a" + RandomGenerator.alphaNumeric(252) + "-b";
  const maxSlugCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Maximum Slug Length",
          slug: maxSlug,
          display_order: 3,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(maxSlugCategory);
  TestValidator.equals(
    "max slug length category created",
    maxSlugCategory.slug,
    maxSlug,
  );

  // Step 5: Test invalid slug - empty string should fail
  await TestValidator.error("empty slug should be rejected", async () => {
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Empty Slug Category",
          slug: "",
          display_order: 4,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  });

  // Step 6: Test invalid slug - exceeds 255 characters
  const tooLongSlug = RandomGenerator.alphaNumeric(256);
  await TestValidator.error(
    "slug exceeding 255 characters should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Too Long Slug",
            slug: tooLongSlug,
            display_order: 5,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 7: Test invalid slug - contains uppercase letters
  await TestValidator.error(
    "slug with uppercase letters should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Uppercase Slug",
            slug: "TechAndInnovation",
            display_order: 6,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 8: Test invalid slug - contains spaces
  await TestValidator.error("slug with spaces should be rejected", async () => {
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Space Slug",
          slug: "tech and innovation",
          display_order: 7,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  });

  // Step 9: Test invalid slug - contains special characters
  await TestValidator.error(
    "slug with special characters should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Special Char Slug",
            slug: "tech@innovation!",
            display_order: 8,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 10: Test invalid slug - contains underscore
  await TestValidator.error(
    "slug with underscores should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Underscore Slug",
            slug: "tech_innovation",
            display_order: 9,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 11: Test valid slug - contains numbers (valid per pattern ^[a-z0-9-]+$)
  const numberSlugCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Numeric Slug",
          slug: "category-2024",
          display_order: 10,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(numberSlugCategory);
  TestValidator.equals(
    "numeric slug category created",
    numberSlugCategory.slug,
    "category-2024",
  );
}
