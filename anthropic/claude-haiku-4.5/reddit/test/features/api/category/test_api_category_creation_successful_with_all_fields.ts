import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful creation of a category with all optional and required fields.
 *
 * Validates that an administrator can create a category with complete
 * information including name, slug, description, icon_url, and display_order.
 * The test verifies that all fields are persisted correctly in the system, the
 * category is automatically marked as active, proper timestamps are recorded,
 * and the response includes all created category details.
 *
 * Steps:
 *
 * 1. Administrator joins the platform via authentication endpoint
 * 2. Administrator creates a category with all fields populated
 * 3. Validate all request fields are returned in the response
 * 4. Validate is_active defaults to true
 * 5. Validate timestamps are properly recorded
 * 6. Validate the UUID ID is generated
 */
export async function test_api_category_creation_successful_with_all_fields(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const adminUsername = RandomGenerator.alphabets(8);
  const adminName = RandomGenerator.name();

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin/categories",
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin authenticated", admin.account_status, "active");

  // Step 2: Create category with all fields
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categorySlug = RandomGenerator.alphabets(10).toLowerCase();
  const categoryDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const categoryIconUrl = typia.random<string & tags.Format<"uri">>();
  const categoryDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: categoryDescription,
          icon_url: categoryIconUrl,
          display_order: categoryDisplayOrder,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Validate all request fields are returned in response
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches",
    createdCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category description matches",
    createdCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "category icon_url matches",
    createdCategory.icon_url,
    categoryIconUrl,
  );
  TestValidator.equals(
    "category display_order matches",
    createdCategory.display_order,
    categoryDisplayOrder,
  );

  // Step 4: Validate is_active defaults to true
  TestValidator.equals(
    "category is_active defaults to true",
    createdCategory.is_active,
    true,
  );

  // Step 5: Validate category ID is generated
  TestValidator.predicate(
    "category id is generated as UUID",
    createdCategory.id.length === 36 && createdCategory.id.includes("-"),
  );

  // Step 6: Validate timestamps exist and are reasonable
  TestValidator.predicate(
    "created_at timestamp is set",
    createdCategory.created_at !== null &&
      createdCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    createdCategory.updated_at !== null &&
      createdCategory.updated_at !== undefined,
  );
}
