import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test slug format validation for category creation.
 *
 * This test validates that the API properly enforces slug format constraints.
 * The slug field must contain only lowercase alphanumeric characters and
 * hyphens, following the pattern: ^[a-z0-9-]+$
 *
 * Test workflow:
 *
 * 1. Create an administrator account to gain authorization
 * 2. Attempt to create categories with various invalid slug formats
 * 3. Validate that each invalid slug is properly rejected
 * 4. Confirm error handling for uppercase letters, underscores, special characters
 */
export async function test_api_category_creation_invalid_slug_format(
  connection: api.IConnection,
) {
  // Step 1: Create administrator for authorization
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/categories",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test invalid slug with uppercase letters
  await TestValidator.error(
    "should reject slug with uppercase letters",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Technology Category",
            slug: "Technology-News",
            display_order: 1,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 3: Test invalid slug with underscores
  await TestValidator.error("should reject slug with underscores", async () => {
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Entertainment Category",
          slug: "entertainment_news",
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  });

  // Step 4: Test invalid slug with special characters
  await TestValidator.error(
    "should reject slug with special characters",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Sports Category",
            slug: "sports@news!",
            display_order: 3,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 5: Test invalid slug with spaces
  await TestValidator.error("should reject slug with spaces", async () => {
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Gaming Category",
          slug: "gaming news",
          display_order: 4,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  });

  // Step 6: Test valid slug format for comparison
  const validCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Valid Tech Category",
          slug: "valid-tech-news",
          display_order: 5,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(validCategory);
  TestValidator.equals(
    "valid slug format",
    validCategory.slug,
    "valid-tech-news",
  );
}
