import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_category_creation_display_order(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("administrator email matches", admin.email, adminEmail);

  // Step 2: Create categories with different display_order values
  // Test boundary case: display_order = 0
  const category0: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Category Zero",
          slug: "category-zero",
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category0);
  TestValidator.equals("display_order is 0", category0.display_order, 0);

  // Test normal case: display_order = 1
  const category1: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Category One",
          slug: "category-one",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category1);
  TestValidator.equals("display_order is 1", category1.display_order, 1);

  // Test mid-range: display_order = 100
  const category100: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Category Hundred",
          slug: "category-hundred",
          display_order: 100,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category100);
  TestValidator.equals("display_order is 100", category100.display_order, 100);

  // Test large value: display_order = 1000
  const category1000: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Category Thousand",
          slug: "category-thousand",
          display_order: 1000,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category1000);
  TestValidator.equals(
    "display_order is 1000",
    category1000.display_order,
    1000,
  );

  // Step 3: Verify sort order by display_order
  TestValidator.predicate(
    "category0 should come before category1",
    category0.display_order < category1.display_order,
  );
  TestValidator.predicate(
    "category1 should come before category100",
    category1.display_order < category100.display_order,
  );
  TestValidator.predicate(
    "category100 should come before category1000",
    category100.display_order < category1000.display_order,
  );

  // Step 4: Create additional categories to test sorting in list context
  const categoryA: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "First Priority",
          slug: "first-priority",
          display_order: 5,
          description: "This should appear early in listings",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryA);
  TestValidator.equals(
    "categoryA display_order is 5",
    categoryA.display_order,
    5,
  );

  const categoryB: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Second Priority",
          slug: "second-priority",
          display_order: 50,
          description: "This should appear in the middle",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryB);
  TestValidator.equals(
    "categoryB display_order is 50",
    categoryB.display_order,
    50,
  );

  // Step 5: Verify all categories have non-negative display_order
  const allCategories = [
    category0,
    category1,
    category100,
    category1000,
    categoryA,
    categoryB,
  ];
  TestValidator.predicate(
    "all categories have non-negative display_order",
    allCategories.every((cat) => cat.display_order >= 0),
  );

  // Step 6: Verify categories maintain unique identities
  const categoryIds = allCategories.map((cat) => cat.id);
  const uniqueIds = new Set(categoryIds);
  TestValidator.equals(
    "all category IDs are unique",
    categoryIds.length,
    uniqueIds.size,
  );
}
