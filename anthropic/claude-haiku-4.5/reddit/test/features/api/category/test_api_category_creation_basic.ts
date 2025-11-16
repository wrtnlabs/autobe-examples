import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate successful creation of a basic category by an administrator.
 *
 * This test verifies that platform administrators can create new content
 * categories with required fields (name, slug, display_order) and optional
 * fields (description, icon_url). The test validates that the API returns a
 * properly formed category object with:
 *
 * - Unique UUID identifier
 * - Provided name and slug values
 * - Default is_active=true status
 * - ISO 8601 formatted timestamps for creation and update
 * - Null values for optional fields when not provided
 *
 * The category taxonomy is essential for organizing and classifying communities
 * on the platform. This test ensures the basic category creation workflow
 * functions correctly.
 *
 * Steps:
 *
 * 1. Create and authenticate administrator account
 * 2. Generate random category data with required fields
 * 3. Submit category creation request via API
 * 4. Validate response structure and field values
 * 5. Verify default values and optional field handling
 */
export async function test_api_category_creation_basic(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Generate random category data with required fields
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categorySlug = RandomGenerator.alphabets(15).toLowerCase();
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  // Step 3: Submit category creation request via API
  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          display_order: displayOrder,
          description: null,
          icon_url: null,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 4: Validate response structure and field values
  TestValidator.equals(
    "created category name matches input",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "created category slug matches input",
    createdCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "created category display_order matches input",
    createdCategory.display_order,
    displayOrder,
  );

  // Step 5: Verify default values and optional field handling
  TestValidator.predicate(
    "category id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdCategory.id,
    ),
  );
  TestValidator.equals(
    "category is active by default",
    createdCategory.is_active,
    true,
  );
  TestValidator.equals(
    "category description is null when not provided",
    createdCategory.description,
    null,
  );
  TestValidator.equals(
    "category icon_url is null when not provided",
    createdCategory.icon_url,
    null,
  );

  // Verify timestamps are properly formatted
  TestValidator.predicate(
    "category created_at is valid ISO 8601 timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      createdCategory.created_at,
    ),
  );
  TestValidator.predicate(
    "category updated_at is valid ISO 8601 timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      createdCategory.updated_at,
    ),
  );
}
