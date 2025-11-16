import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test category creation with all required fields: name, slug, and
 * display_order.
 *
 * This test validates the complete category creation workflow:
 *
 * 1. Create an administrator account to have proper authorization
 * 2. Create a new category with all required fields (name, slug, display_order)
 * 3. Verify successful creation with HTTP 201 response
 * 4. Validate that the response includes auto-generated UUID id and timestamps
 * 5. Confirm is_active flag is true for newly created categories
 * 6. Verify all provided field values are correctly stored and returned
 * 7. Test optional description field
 * 8. Validate that invalid business values are rejected
 */
export async function test_api_category_creation_required_fields(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category with all required fields
  const categoryName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 4,
  });
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          display_order: displayOrder,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Validate category creation response
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches input",
    createdCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category display_order matches input",
    createdCategory.display_order,
    displayOrder,
  );
  TestValidator.equals(
    "category is active on creation",
    createdCategory.is_active,
    true,
  );
  TestValidator.predicate(
    "category has id assigned",
    createdCategory.id !== null && createdCategory.id !== undefined,
  );
  TestValidator.predicate(
    "category has created_at timestamp",
    createdCategory.created_at !== null &&
      createdCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "category has updated_at timestamp",
    createdCategory.updated_at !== null &&
      createdCategory.updated_at !== undefined,
  );

  // Step 4: Test category creation with optional description
  const categoryWithDescription = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 6,
  });
  const descSlug = "tech-category-" + RandomGenerator.alphaNumeric(6);

  const createdCategoryWithDesc: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: descSlug,
          display_order: 1,
          description: categoryWithDescription,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategoryWithDesc);

  TestValidator.equals(
    "category with description stored correctly",
    createdCategoryWithDesc.description,
    categoryWithDescription,
  );

  // Step 5: Test category creation with icon_url
  const categoryWithIcon = "https://example.com/icon.png";
  const iconSlug = "media-category-" + RandomGenerator.alphaNumeric(6);

  const createdCategoryWithIcon: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Media",
          slug: iconSlug,
          display_order: 2,
          icon_url: categoryWithIcon,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategoryWithIcon);

  TestValidator.equals(
    "category with icon_url stored correctly",
    createdCategoryWithIcon.icon_url,
    categoryWithIcon,
  );

  // Step 6: Validate required fields are enforced
  await TestValidator.error(
    "category creation fails with empty name",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "",
            slug: "test-slug-" + RandomGenerator.alphaNumeric(4),
            display_order: 0,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  await TestValidator.error(
    "category creation fails with slug containing invalid characters",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Test Category",
            slug: "Invalid_Slug_With_Underscores",
            display_order: 0,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  await TestValidator.error(
    "category creation fails with negative display_order",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Test Category",
            slug: "test-slug-" + RandomGenerator.alphaNumeric(4),
            display_order: -1,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );
}
