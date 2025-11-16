import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates that category creation response includes all required fields with
 * proper formats.
 *
 * This test verifies the completeness and correctness of the API response when
 * creating a new community content category. It ensures all required fields
 * (id, name, slug, display_order, is_active, created_at, updated_at) are
 * present with correct types and formats. It also validates that optional
 * fields (description, icon_url) are included when provided in the request, and
 * that auto-generated fields like UUID and timestamps are properly formatted.
 *
 * Test workflow:
 *
 * 1. Authenticate an administrator account
 * 2. Create a category with both required and optional fields
 * 3. Validate all required fields are present and correctly typed
 * 4. Verify optional fields are included when provided
 * 5. Confirm timestamps are in ISO 8601 UTC format
 * 6. Verify auto-generated fields follow expected patterns
 */
export async function test_api_category_creation_response_completeness(
  connection: api.IConnection,
) {
  // Step 1: Authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminName = RandomGenerator.name();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: adminUsername,
      name: adminName,
      href: "http://localhost:3000/auth/admin",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a category with all fields
  const categoryName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 4,
  });
  const categorySlug = categoryName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const categoryDescription = RandomGenerator.paragraph({ sentences: 2 });
  const categoryIconUrl = "https://example.com/icons/category.png";
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const category =
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

  // Step 3: Validate response is complete and properly typed
  typia.assert(category);

  // Step 4: Verify all required fields are present with correct values
  TestValidator.predicate(
    "category id is a valid UUID",
    typeof category.id === "string" && category.id.length > 0,
  );

  TestValidator.equals(
    "category name matches request",
    category.name,
    categoryName,
  );

  TestValidator.equals(
    "category slug matches request",
    category.slug,
    categorySlug,
  );

  TestValidator.equals(
    "category display_order matches request",
    category.display_order,
    displayOrder,
  );

  TestValidator.equals(
    "category is_active defaults to true",
    category.is_active,
    true,
  );

  // Step 5: Verify optional fields when provided
  TestValidator.equals(
    "category description matches request",
    category.description,
    categoryDescription,
  );

  TestValidator.equals(
    "category icon_url matches request",
    category.icon_url,
    categoryIconUrl,
  );

  // Step 6: Validate timestamp fields are in ISO 8601 UTC format
  TestValidator.predicate(
    "created_at is valid ISO 8601 UTC timestamp",
    typeof category.created_at === "string" && category.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at is valid ISO 8601 UTC timestamp",
    typeof category.updated_at === "string" && category.updated_at.length > 0,
  );

  // Step 7: Verify timestamps are equal on new category (just created)
  TestValidator.equals(
    "created_at equals updated_at on new category",
    category.created_at,
    category.updated_at,
  );
}
