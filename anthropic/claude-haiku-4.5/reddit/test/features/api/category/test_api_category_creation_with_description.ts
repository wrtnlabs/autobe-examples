import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test category creation with optional description.
 *
 * This test validates that administrators can create new community content
 * categories with optional descriptions (0-500 characters). The description
 * provides guidance to community creators about the category's scope and what
 * types of communities belong in it.
 *
 * Test workflow:
 *
 * 1. Administrator registration with unique credentials
 * 2. Category creation with name, slug, display order, and description
 * 3. Response validation to ensure description is stored and returned correctly
 */
export async function test_api_category_creation_with_description(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category with description
  const categoryName = RandomGenerator.name(2);
  const categorySlug = RandomGenerator.alphabets(8).toLowerCase();
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: categoryDescription,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // 3. Verify category properties match the request
  TestValidator.equals(
    "category name matches request",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches request",
    createdCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category description matches request",
    createdCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "category display order matches request",
    createdCategory.display_order,
    1,
  );
  TestValidator.predicate(
    "category is marked as active",
    createdCategory.is_active,
  );

  // 4. Test category creation without explicit description (optional field)
  const noDescriptionCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(6).toLowerCase(),
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(noDescriptionCategory);
  TestValidator.predicate(
    "category without explicit description allows null",
    noDescriptionCategory.description === null ||
      noDescriptionCategory.description === undefined,
  );
}
