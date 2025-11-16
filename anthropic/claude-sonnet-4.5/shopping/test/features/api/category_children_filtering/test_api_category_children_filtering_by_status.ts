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
 * Test that child category retrieval supports filtering by category status
 * (active/inactive).
 *
 * This test validates the category status filtering functionality by:
 *
 * 1. Creating an admin account for authorization
 * 2. Creating a parent category to hold child categories
 * 3. Creating multiple child categories with different statuses (some active, some
 *    inactive)
 * 4. Testing status filter with "active" - verifies only active children are
 *    returned
 * 5. Testing status filter with "inactive" - verifies only inactive children are
 *    returned
 * 6. Testing without status filter - verifies all children are returned regardless
 *    of status
 * 7. Validating pagination and sorting work correctly with status filtering
 *    applied
 * 8. Ensuring filtered results accurately reflect the database state
 *
 * This ensures that category browsing interfaces can properly filter categories
 * based on visibility status, allowing admins to view all categories while
 * public interfaces show only active ones.
 */
export async function test_api_category_children_filtering_by_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create parent category
  const parentCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // Step 3: Create multiple child categories with different statuses
  const activeChildren = await ArrayUtil.asyncRepeat(3, async (index) => {
    return await api.functional.shoppingMall.admin.categories.create(
      connection,
      {
        body: {
          parent_id: parentCategory.id,
          name: `Active Child ${index + 1}`,
          slug: `active-child-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          image_url: typia.random<string & tags.Format<"uri">>(),
          display_order: index + 1,
          status: "active",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  });
  activeChildren.forEach((child) => typia.assert(child));

  const inactiveChildren = await ArrayUtil.asyncRepeat(2, async (index) => {
    return await api.functional.shoppingMall.admin.categories.create(
      connection,
      {
        body: {
          parent_id: parentCategory.id,
          name: `Inactive Child ${index + 1}`,
          slug: `inactive-child-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          image_url: typia.random<string & tags.Format<"uri">>(),
          display_order: index + 10,
          status: "inactive",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  });
  inactiveChildren.forEach((child) => typia.assert(child));

  // Step 4: Test filtering with status: "active"
  const activeFilteredResult =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        page: 1,
        limit: 10,
        status: "active",
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(activeFilteredResult);

  TestValidator.equals(
    "active filter should return correct count",
    activeFilteredResult.data.length,
    3,
  );

  TestValidator.predicate(
    "all returned categories should have active status",
    activeFilteredResult.data.every((cat) => cat.status === "active"),
  );

  // Step 5: Test filtering with status: "inactive"
  const inactiveFilteredResult =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        page: 1,
        limit: 10,
        status: "inactive",
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(inactiveFilteredResult);

  TestValidator.equals(
    "inactive filter should return correct count",
    inactiveFilteredResult.data.length,
    2,
  );

  TestValidator.predicate(
    "all returned categories should have inactive status",
    inactiveFilteredResult.data.every((cat) => cat.status === "inactive"),
  );

  // Step 6: Test without status filter (should return all children)
  const allChildrenResult =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(allChildrenResult);

  TestValidator.equals(
    "no filter should return all children",
    allChildrenResult.data.length,
    5,
  );

  // Step 7: Validate pagination works with status filtering
  const paginatedActiveResult =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        page: 1,
        limit: 2,
        status: "active",
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(paginatedActiveResult);

  TestValidator.equals(
    "paginated active filter should respect limit",
    paginatedActiveResult.data.length,
    2,
  );

  TestValidator.equals(
    "pagination metadata should show correct total records",
    paginatedActiveResult.pagination.records,
    3,
  );

  // Step 8: Verify filtered results match expected data
  const activeIds = activeChildren.map((c) => c.id);
  const returnedActiveIds = activeFilteredResult.data.map((c) => c.id);

  TestValidator.predicate(
    "returned active IDs should match created active categories",
    returnedActiveIds.every((id) => activeIds.includes(id)),
  );

  const inactiveIds = inactiveChildren.map((c) => c.id);
  const returnedInactiveIds = inactiveFilteredResult.data.map((c) => c.id);

  TestValidator.predicate(
    "returned inactive IDs should match created inactive categories",
    returnedInactiveIds.every((id) => inactiveIds.includes(id)),
  );
}
