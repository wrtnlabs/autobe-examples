import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates that category slug format is properly enforced during creation.
 *
 * This test ensures the API properly handles category creation with various
 * valid slug formats containing only lowercase alphanumeric characters and
 * hyphens, confirming that the API accepts properly formatted category slugs
 * and validates the complete category lifecycle.
 *
 * Process:
 *
 * 1. Create a platform administrator account
 * 2. Create categories with various valid slug formats
 * 3. Verify each category is created successfully with correct slug format
 * 4. Confirm all created categories are marked as active and properly stored
 */
export async function test_api_category_creation_slug_format_validation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/setup",
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate("admin should be created", admin.id !== null);

  // Step 2: Create a valid category with lowercase and hyphens
  const category1: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology topics and discussions",
          icon_url: "https://example.com/tech-icon.png",
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category1);
  TestValidator.equals(
    "category1 slug should be lowercase",
    category1.slug,
    "technology",
  );
  TestValidator.predicate(
    "category1 should match slug pattern",
    /^[a-z0-9-]+$/.test(category1.slug),
  );
  TestValidator.predicate(
    "category1 should be active",
    category1.is_active === true,
  );

  // Step 3: Create category with numbers and hyphens
  const category2: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Science 2024",
          slug: "science-2024",
          description: "Science discussions and topics",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category2);
  TestValidator.equals(
    "category2 slug should contain numbers and hyphens",
    category2.slug,
    "science-2024",
  );
  TestValidator.predicate(
    "category2 slug should match pattern",
    /^[a-z0-9-]+$/.test(category2.slug),
  );

  // Step 4: Create category with multiple hyphens
  const category3: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Arts and Crafts",
          slug: "arts-and-crafts",
          description: "Creative arts and crafting discussions",
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category3);
  TestValidator.equals(
    "category3 slug should have multiple hyphens",
    category3.slug,
    "arts-and-crafts",
  );
  TestValidator.predicate(
    "category3 slug format valid",
    /^[a-z0-9-]+$/.test(category3.slug),
  );

  // Step 5: Create category with only numbers
  const category4: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Test 123",
          slug: "test-123",
          description: "Test category with numbers",
          display_order: 3,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category4);
  TestValidator.equals(
    "category4 slug correct format",
    category4.slug,
    "test-123",
  );
  TestValidator.predicate(
    "category4 contains valid characters",
    /^[a-z0-9-]+$/.test(category4.slug),
  );

  // Step 6: Verify all categories were created with proper structure
  TestValidator.predicate(
    "category1 has id",
    category1.id !== null && category1.id !== undefined,
  );
  TestValidator.predicate(
    "category2 has id",
    category2.id !== null && category2.id !== undefined,
  );
  TestValidator.predicate(
    "category3 has id",
    category3.id !== null && category3.id !== undefined,
  );
  TestValidator.predicate(
    "category4 has id",
    category4.id !== null && category4.id !== undefined,
  );

  // Step 7: Verify all categories have proper timestamps
  TestValidator.predicate(
    "category1 has created_at",
    category1.created_at !== null,
  );
  TestValidator.predicate(
    "category1 has updated_at",
    category1.updated_at !== null,
  );
  TestValidator.predicate(
    "category2 has created_at",
    category2.created_at !== null,
  );
  TestValidator.predicate(
    "category4 has created_at",
    category4.created_at !== null,
  );
}
