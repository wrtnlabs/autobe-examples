import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test category sorting using the display_order field to validate custom
 * merchandising sequence.
 *
 * This test creates multiple categories with different display_order values and
 * verifies they are returned in the correct sequence based on
 * administrator-defined ordering. Tests both ascending (lowest to highest) and
 * descending (highest to lowest) sort directions to ensure admins can control
 * category presentation order for optimal user experience and merchandising
 * strategy.
 *
 * Steps:
 *
 * 1. Authenticate as admin to gain category creation privileges
 * 2. Create 5 test categories with distinct display_order values (10, 50, 25, 100,
 *    5)
 * 3. Query categories with ascending sort and verify order matches display_order
 *    values
 * 4. Query categories with descending sort and verify reverse order
 * 5. Validate that sorting correctly prioritizes display_order over other fields
 */
export async function test_api_category_sorting_by_display_order(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create 5 categories with different display_order values
  const displayOrders = [10, 50, 25, 100, 5];
  const createdCategories: IShoppingMallCategory[] = [];

  for (const order of displayOrders) {
    const category = await api.functional.shoppingMall.admin.categories.create(
      connection,
      {
        body: {
          name: `Category ${order}`,
          slug: `category-${order}-${typia.random<number & tags.Type<"uint32">>()}`,
          display_order: order,
          status: "active",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
    typia.assert(category);
    createdCategories.push(category);
  }

  // Step 3: Query categories with ascending sort
  const ascendingResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        sort_by: "display_order",
        sort_direction: "asc",
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(ascendingResult);

  // Filter to only our created categories
  const ascCategories = ascendingResult.data.filter((cat) =>
    createdCategories.some((created) => created.id === cat.id),
  );

  // Validate ascending order: [5, 10, 25, 50, 100]
  const expectedAscOrder = [5, 10, 25, 50, 100];
  TestValidator.equals(
    "ascending sort should have 5 categories",
    ascCategories.length,
    5,
  );

  for (let i = 0; i < ascCategories.length; i++) {
    TestValidator.equals(
      `ascending sort position ${i} should have display_order ${expectedAscOrder[i]}`,
      ascCategories[i].display_order,
      expectedAscOrder[i],
    );
  }

  // Step 4: Query categories with descending sort
  const descendingResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        sort_by: "display_order",
        sort_direction: "desc",
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(descendingResult);

  // Filter to only our created categories
  const descCategories = descendingResult.data.filter((cat) =>
    createdCategories.some((created) => created.id === cat.id),
  );

  // Validate descending order: [100, 50, 25, 10, 5]
  const expectedDescOrder = [100, 50, 25, 10, 5];
  TestValidator.equals(
    "descending sort should have 5 categories",
    descCategories.length,
    5,
  );

  for (let i = 0; i < descCategories.length; i++) {
    TestValidator.equals(
      `descending sort position ${i} should have display_order ${expectedDescOrder[i]}`,
      descCategories[i].display_order,
      expectedDescOrder[i],
    );
  }
}
