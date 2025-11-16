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
 * Test pagination functionality for retrieving child categories.
 *
 * This test validates that the child category pagination API properly
 * implements configurable page sizes and navigation through large category
 * hierarchies. It creates a parent category with 25 children, then tests
 * pagination with different page requests to ensure proper data segmentation
 * and metadata accuracy.
 *
 * Steps:
 *
 * 1. Admin authentication
 * 2. Create parent category
 * 3. Create 25 child categories
 * 4. Test first page (10 items)
 * 5. Verify pagination metadata
 * 6. Test second page navigation
 * 7. Test final page with remaining items
 * 8. Test edge case (beyond available pages)
 */
export async function test_api_category_children_pagination(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: RandomGenerator.pick([
        "super_admin",
        "moderator",
        "support",
      ] as const),
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
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // Step 3: Create 25 child categories
  const childCategories = await ArrayUtil.asyncRepeat(25, async (index) => {
    const child = await api.functional.shoppingMall.admin.categories.create(
      connection,
      {
        body: {
          parent_id: parentCategory.id,
          name: `${RandomGenerator.name(1)}_${index + 1}`,
          slug: `${RandomGenerator.alphaNumeric(6)}_${index + 1}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: index + 1,
          status: "active",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
    typia.assert(child);
    return child;
  });

  // Step 4: Request first page with limit of 10
  const firstPage = await api.functional.shoppingMall.categories.children.index(
    connection,
    {
      categoryId: parentCategory.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(firstPage);

  // Step 5: Verify first page contains exactly 10 records
  TestValidator.equals("first page data count", firstPage.data.length, 10);

  // Step 6: Verify pagination metadata for first page
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.equals(
    "first page total records",
    firstPage.pagination.records,
    25,
  );
  TestValidator.equals("first page total pages", firstPage.pagination.pages, 3);

  // Step 7: Request second page
  const secondPage =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(secondPage);

  // Step 8: Verify second page contains exactly 10 records
  TestValidator.equals("second page data count", secondPage.data.length, 10);

  // Step 9: Verify pagination metadata for second page
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  TestValidator.equals(
    "second page total records",
    secondPage.pagination.records,
    25,
  );
  TestValidator.equals(
    "second page total pages",
    secondPage.pagination.pages,
    3,
  );

  // Step 10: Verify first and second pages return different categories
  const firstPageIds = firstPage.data.map((cat) => cat.id);
  const secondPageIds = secondPage.data.map((cat) => cat.id);
  const hasOverlap = firstPageIds.some((id) => secondPageIds.includes(id));
  TestValidator.predicate(
    "first and second pages have no overlap",
    !hasOverlap,
  );

  // Step 11: Request third/final page
  const thirdPage = await api.functional.shoppingMall.categories.children.index(
    connection,
    {
      categoryId: parentCategory.id,
      body: {
        page: 3,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(thirdPage);

  // Step 12: Verify final page contains remaining records (5 items)
  TestValidator.equals("third page data count", thirdPage.data.length, 5);

  // Step 13: Verify pagination metadata for final page
  TestValidator.equals("third page current", thirdPage.pagination.current, 3);
  TestValidator.equals("third page limit", thirdPage.pagination.limit, 10);
  TestValidator.equals(
    "third page total records",
    thirdPage.pagination.records,
    25,
  );
  TestValidator.equals("third page total pages", thirdPage.pagination.pages, 3);

  // Step 14: Test edge case - request page beyond available pages
  const beyondPage =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        page: 10,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(beyondPage);

  // Step 15: Verify beyond page returns empty data
  TestValidator.equals("beyond page data count", beyondPage.data.length, 0);

  // Step 16: Verify pagination metadata for beyond page
  TestValidator.equals(
    "beyond page current",
    beyondPage.pagination.current,
    10,
  );
  TestValidator.equals(
    "beyond page total records",
    beyondPage.pagination.records,
    25,
  );
  TestValidator.equals(
    "beyond page total pages",
    beyondPage.pagination.pages,
    3,
  );
}
