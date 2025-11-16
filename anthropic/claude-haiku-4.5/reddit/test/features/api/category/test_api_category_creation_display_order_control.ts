import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that display order properly controls category organization and that
 * administrators can create categories with various display order values.
 *
 * This test validates:
 *
 * 1. Administrator account creation for category management
 * 2. Category creation with different display_order values (1, 5, 10, 12, 15, 20,
 *    0, 1000)
 * 3. Support for edge cases: display_order 0 and very large values
 * 4. Support for duplicate display_order values
 * 5. Proper field persistence and validation
 *
 * The test creates categories with various display orders and verifies they are
 * created successfully with the correct display_order values persisted.
 */
export async function test_api_category_creation_display_order_control(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "administrator created successfully",
    admin.email,
    adminEmail,
  );

  // Step 2 & 3: Create categories with various display orders
  const displayOrders = [10, 5, 15, 1, 20];
  const categories: ICommunityPlatformCategory[] = [];

  for (const displayOrder of displayOrders) {
    const category =
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: `Category Order ${displayOrder}`,
            slug: `cat-order-${displayOrder}-${RandomGenerator.alphaNumeric(4)}`,
            display_order: displayOrder,
            description: `Category with display order ${displayOrder}`,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    typia.assert(category);
    categories.push(category);
  }

  // Verify all categories were created with correct display_order values
  for (let i = 0; i < categories.length; i++) {
    TestValidator.equals(
      `category ${i} display_order persisted correctly`,
      categories[i].display_order,
      displayOrders[i],
    );
  }

  // Step 4: Create new category with display_order between existing (12)
  const categoryBetween =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Category Between",
          slug: `cat-between-${RandomGenerator.alphaNumeric(4)}`,
          display_order: 12,
          description: "Category inserted between existing orders",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryBetween);
  TestValidator.equals(
    "inserted category display_order persisted",
    categoryBetween.display_order,
    12,
  );

  // Step 5: Create multiple categories with same display_order
  const categorySame1 =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Category Same A",
          slug: `cat-same-a-${RandomGenerator.alphaNumeric(4)}`,
          display_order: 7,
          description: "First category with duplicate order",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categorySame1);

  const categorySame2 =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Category Same B",
          slug: `cat-same-b-${RandomGenerator.alphaNumeric(4)}`,
          display_order: 7,
          description: "Second category with duplicate order",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categorySame2);

  TestValidator.equals(
    "first category with duplicate order created",
    categorySame1.display_order,
    7,
  );
  TestValidator.equals(
    "second category with duplicate order created",
    categorySame2.display_order,
    7,
  );

  // Step 6: Create category with display_order 0 (edge case - minimum)
  const categoryZero =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Category Zero",
          slug: `cat-zero-${RandomGenerator.alphaNumeric(4)}`,
          display_order: 0,
          description: "Category with minimum display order",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryZero);
  TestValidator.equals(
    "category with display_order 0 created",
    categoryZero.display_order,
    0,
  );

  // Step 7: Create category with very large display_order (edge case - maximum)
  const categoryLarge =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Category Large",
          slug: `cat-large-${RandomGenerator.alphaNumeric(4)}`,
          display_order: 1000,
          description: "Category with very large display order",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryLarge);
  TestValidator.equals(
    "category with large display_order created",
    categoryLarge.display_order,
    1000,
  );

  // Validation: Verify all categories have valid display_order values
  const allCreatedCategories = [
    ...categories,
    categoryBetween,
    categorySame1,
    categorySame2,
    categoryZero,
    categoryLarge,
  ];

  TestValidator.predicate(
    "all categories have numeric display_order",
    allCreatedCategories.every((c) => typeof c.display_order === "number"),
  );

  TestValidator.predicate(
    "all categories have non-negative display_order",
    allCreatedCategories.every((c) => c.display_order >= 0),
  );

  TestValidator.predicate(
    "display_order values include edge cases",
    allCreatedCategories.some((c) => c.display_order === 0) &&
      allCreatedCategories.some((c) => c.display_order === 1000),
  );

  TestValidator.predicate(
    "display_order values include duplicates",
    allCreatedCategories.filter((c) => c.display_order === 7).length === 2,
  );
}
