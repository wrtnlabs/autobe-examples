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
 * Test filtering categories by active status to retrieve only categories
 * visible to buyers.
 *
 * This test validates the category filtering functionality by creating multiple
 * categories with different statuses (active and inactive), then filtering by
 * status="active" to ensure only active categories appear in the results. This
 * is critical for public-facing category browsing where only operational
 * categories should be visible.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to gain category management permissions
 * 2. Create multiple active categories for positive test cases
 * 3. Create multiple inactive categories to verify exclusion
 * 4. Query categories with status filter set to "active"
 * 5. Validate that only active categories appear in results
 * 6. Verify that all inactive categories are excluded from the filtered results
 */
export async function test_api_category_filter_by_status_active(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
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

  // Step 2: Create multiple active categories
  const activeCategories: IShoppingMallCategory[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const category: IShoppingMallCategory =
        await api.functional.shoppingMall.admin.categories.create(connection, {
          body: {
            name: `Active Category ${index + 1} ${RandomGenerator.alphabets(5)}`,
            slug: `active-category-${index + 1}-${RandomGenerator.alphaNumeric(8)}`,
            description: RandomGenerator.paragraph({ sentences: 5 }),
            display_order: index,
            status: "active",
          } satisfies IShoppingMallCategory.ICreate,
        });
      typia.assert(category);
      return category;
    },
  );

  // Step 3: Create multiple inactive categories
  const inactiveCategories: IShoppingMallCategory[] =
    await ArrayUtil.asyncRepeat(2, async (index) => {
      const category: IShoppingMallCategory =
        await api.functional.shoppingMall.admin.categories.create(connection, {
          body: {
            name: `Inactive Category ${index + 1} ${RandomGenerator.alphabets(5)}`,
            slug: `inactive-category-${index + 1}-${RandomGenerator.alphaNumeric(8)}`,
            description: RandomGenerator.paragraph({ sentences: 5 }),
            display_order: index + 100,
            status: "inactive",
          } satisfies IShoppingMallCategory.ICreate,
        });
      typia.assert(category);
      return category;
    });

  // Step 4: Query categories with status filter set to "active"
  const filteredResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        status: "active",
        page: 1,
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(filteredResult);

  // Step 5: Validate that only active categories appear in results
  const activeCategoryIds = activeCategories.map((c) => c.id);
  const returnedActiveCategories = filteredResult.data.filter((c) =>
    activeCategoryIds.includes(c.id),
  );

  TestValidator.predicate(
    "all created active categories should be in the filtered results",
    returnedActiveCategories.length === activeCategories.length,
  );

  // Step 6: Verify all returned categories have status="active"
  filteredResult.data.forEach((category, index) => {
    TestValidator.equals(
      `category ${index} status should be active`,
      category.status,
      "active",
    );
  });

  // Step 7: Verify that NO inactive categories appear in the filtered results
  const inactiveCategoryIds = inactiveCategories.map((c) => c.id);
  const returnedInactiveCategories = filteredResult.data.filter((c) =>
    inactiveCategoryIds.includes(c.id),
  );

  TestValidator.equals(
    "no inactive categories should appear in active-filtered results",
    returnedInactiveCategories.length,
    0,
  );
}
