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
 * Test filtering categories by inactive status to retrieve only hidden
 * categories.
 *
 * This test validates the category filtering functionality for inactive status,
 * ensuring that only inactive (hidden/archived) categories appear in results
 * when the status filter is set to 'inactive'. This is essential for
 * administrative management views that need to show archived or temporarily
 * hidden categories.
 *
 * Test Flow:
 *
 * 1. Authenticate as admin to gain category management permissions
 * 2. Create multiple inactive categories for filtering test data
 * 3. Create active categories to verify exclusion from inactive filter results
 * 4. Filter categories by status='inactive' using the category index API
 * 5. Validate that all returned categories have inactive status
 * 6. Verify that active categories are excluded from the results
 * 7. Confirm pagination metadata reflects only inactive category count
 */
export async function test_api_category_filter_by_status_inactive(
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

  // Step 2: Create inactive categories for filtering test
  const inactiveCategories: IShoppingMallCategory[] =
    await ArrayUtil.asyncRepeat(3, async (index) => {
      const category =
        await api.functional.shoppingMall.admin.categories.create(connection, {
          body: {
            name: `Inactive Category ${index + 1}`,
            slug: `inactive-category-${index + 1}-${typia.random<number & tags.Type<"uint32">>()}`,
            status: "inactive",
            display_order: index,
            description: RandomGenerator.paragraph({ sentences: 5 }),
            image_url: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallCategory.ICreate,
        });
      typia.assert(category);
      return category;
    });

  // Step 3: Create active categories to verify they are excluded
  const activeCategories: IShoppingMallCategory[] = await ArrayUtil.asyncRepeat(
    2,
    async (index) => {
      const category =
        await api.functional.shoppingMall.admin.categories.create(connection, {
          body: {
            name: `Active Category ${index + 1}`,
            slug: `active-category-${index + 1}-${typia.random<number & tags.Type<"uint32">>()}`,
            status: "active",
            display_order: index + 100,
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IShoppingMallCategory.ICreate,
        });
      typia.assert(category);
      return category;
    },
  );

  // Step 4: Filter categories by status='inactive'
  const filteredResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        status: "inactive",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(filteredResult);

  // Step 5: Validate all returned categories have inactive status
  TestValidator.predicate(
    "filtered result should contain categories",
    filteredResult.data.length > 0,
  );

  filteredResult.data.forEach((category) => {
    TestValidator.equals(
      "category status should be inactive",
      category.status,
      "inactive",
    );
  });

  // Step 6: Verify that active categories are not in the results
  const resultIds = filteredResult.data.map((c) => c.id);
  activeCategories.forEach((activeCategory) => {
    TestValidator.predicate(
      "active category should not appear in inactive filter results",
      !resultIds.includes(activeCategory.id),
    );
  });

  // Step 7: Verify that inactive categories we created are in the results
  const createdInactiveIds = inactiveCategories.map((c) => c.id);
  createdInactiveIds.forEach((inactiveId) => {
    TestValidator.predicate(
      "created inactive category should appear in results",
      resultIds.includes(inactiveId),
    );
  });

  // Step 8: Validate pagination metadata reflects inactive categories count
  TestValidator.predicate(
    "pagination should show at least the inactive categories we created",
    filteredResult.pagination.records >= inactiveCategories.length,
  );

  TestValidator.predicate(
    "pagination current page should be 1",
    filteredResult.pagination.current === 1,
  );
}
