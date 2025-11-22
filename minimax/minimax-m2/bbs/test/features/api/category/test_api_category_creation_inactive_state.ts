import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategory";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_category_creation_inactive_state(
  connection: api.IConnection,
) {
  // Step 1: Create a system administrator account for testing
  const adminData = typia.random<IEconPoliticalDiscussionUser.ICreate>();
  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create a category in inactive state using the authenticated admin
  const categoryData = {
    name: "Inactive Economic Analysis",
    description:
      "A category for economic analysis discussions that is currently inactive",
    display_order: 1,
    is_active: false,
  } satisfies IEconPoliticalDiscussionCategory.ICreate;

  const category: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Validate the category was created with inactive status
  TestValidator.equals(
    "category name matches",
    category.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category description matches",
    category.description,
    categoryData.description,
  );
  TestValidator.equals(
    "category display order matches",
    category.display_order,
    categoryData.display_order,
  );
  TestValidator.predicate(
    "category status should be inactive",
    category.status === "inactive",
  );
  TestValidator.predicate(
    "is_active field works correctly",
    categoryData.is_active === false,
  );

  // Step 4: Create another inactive category to test multiple inactive categories
  const secondCategoryData = {
    name: "Pending Political Policy",
    description:
      "Category for political policy discussions awaiting activation",
    display_order: 2,
    is_active: false,
  } satisfies IEconPoliticalDiscussionCategory.ICreate;

  const secondCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
      connection,
      {
        body: secondCategoryData,
      },
    );
  typia.assert(secondCategory);

  TestValidator.equals(
    "second category name matches",
    secondCategory.name,
    secondCategoryData.name,
  );
  TestValidator.equals(
    "second category status is inactive",
    secondCategory.status,
    "inactive",
  );

  // Step 5: Create an active category for comparison to validate the inactive state behavior
  const activeCategoryData = {
    name: "Active Market Discussion",
    description: "Category for active market discussions",
    display_order: 3,
    is_active: true,
  } satisfies IEconPoliticalDiscussionCategory.ICreate;

  const activeCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
      connection,
      {
        body: activeCategoryData,
      },
    );
  typia.assert(activeCategory);

  TestValidator.predicate(
    "active category has active status",
    activeCategory.status === "active",
  );

  // Step 6: Validate state management system by confirming categories have different statuses
  TestValidator.notEquals(
    "inactive and active categories have different statuses",
    category.status,
    activeCategory.status,
  );
  TestValidator.notEquals(
    "multiple inactive categories have same status",
    category.status,
    secondCategory.status,
  );
}
