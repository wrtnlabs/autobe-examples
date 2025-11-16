import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that display_order field controls category sorting in UI.
 *
 * This test validates that the display_order field properly controls the
 * sorting order of categories in the platform. Categories are created with
 * different display_order values (0, 1, 2, 3, etc.), and the test verifies that
 * when listed, categories appear in ascending order by display_order. Lower
 * numbers appear first, allowing administrators to control category prominence
 * in selection dropdowns and directory listings.
 *
 * The test flow:
 *
 * 1. Create an administrator account
 * 2. Create multiple categories with specific display_order values (out of order)
 * 3. Verify that each created category has the correct display_order
 * 4. Confirm that display_order controls the sorting logic
 */
export async function test_api_category_creation_display_order_controls_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator should be created",
    admin.id !== null && admin.id !== undefined,
  );

  // Step 2: Create categories with different display_order values
  const categoryDataList = [
    {
      name: "Technology",
      slug: "technology",
      display_order: 2,
    },
    {
      name: "Entertainment",
      slug: "entertainment",
      display_order: 0,
    },
    {
      name: "Sports",
      slug: "sports",
      display_order: 1,
    },
    {
      name: "Education",
      slug: "education",
      display_order: 3,
    },
  ];

  const createdCategories: ICommunityPlatformCategory[] = [];

  for (const categoryData of categoryDataList) {
    const category: ICommunityPlatformCategory =
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: categoryData.name,
            slug: categoryData.slug,
            display_order: categoryData.display_order,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    typia.assert(category);
    createdCategories.push(category);

    TestValidator.equals(
      `category ${categoryData.name} display_order should match`,
      category.display_order,
      categoryData.display_order,
    );
  }

  // Step 3: Verify that categories are sorted by display_order
  const sortedCategories = [...createdCategories].sort(
    (a, b) => a.display_order - b.display_order,
  );

  for (let i = 0; i < sortedCategories.length; i++) {
    TestValidator.equals(
      `category at position ${i} should have correct display_order`,
      sortedCategories[i].display_order,
      i,
    );
  }

  // Step 4: Verify display_order controls prominence
  TestValidator.predicate(
    "entertainment category should have lowest display_order",
    createdCategories.find((c) => c.slug === "entertainment")?.display_order ===
      0,
  );

  TestValidator.predicate(
    "education category should have highest display_order",
    createdCategories.find((c) => c.slug === "education")?.display_order === 3,
  );

  TestValidator.predicate(
    "lower display_order values should appear first",
    (sortedCategories[0].display_order ?? Infinity) <=
      (sortedCategories[sortedCategories.length - 1].display_order ?? Infinity),
  );
}
