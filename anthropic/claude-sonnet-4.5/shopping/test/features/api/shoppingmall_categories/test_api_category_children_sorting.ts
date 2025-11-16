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
 * Test comprehensive sorting functionality for child category retrieval.
 *
 * This test validates that the child category retrieval endpoint supports
 * multiple sorting options including by name (alphabetical), creation date
 * (chronological), and display order (custom merchandising sequence). The test
 * ensures that both ascending and descending sort directions work correctly for
 * each field.
 *
 * Test Flow:
 *
 * 1. Admin authentication and setup
 * 2. Create parent category with multiple child categories having varied
 *    attributes
 * 3. Test name sorting (ascending and descending)
 * 4. Test created_at sorting (ascending and descending)
 * 5. Test display_order sorting (ascending and descending)
 * 6. Verify all sorting results match expected ordering
 */
export async function test_api_category_children_sorting(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
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

  // Step 2: Create parent category
  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Parent Category",
        slug: `parent-${RandomGenerator.alphaNumeric(8)}`,
        description: "Parent category for sorting tests",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // Step 3: Create child categories with intentionally varied attributes
  const childCategories: IShoppingMallCategory[] = [];

  // Create child with name "Delta", display_order 100
  const child1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: "Delta",
        slug: `delta-${RandomGenerator.alphaNumeric(8)}`,
        description: "Delta category",
        display_order: 100,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(child1);
  childCategories.push(child1);

  // Create child with name "Alpha", display_order 50
  const child2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: "Alpha",
        slug: `alpha-${RandomGenerator.alphaNumeric(8)}`,
        description: "Alpha category",
        display_order: 50,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(child2);
  childCategories.push(child2);

  // Create child with name "Gamma", display_order 200
  const child3: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: "Gamma",
        slug: `gamma-${RandomGenerator.alphaNumeric(8)}`,
        description: "Gamma category",
        display_order: 200,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(child3);
  childCategories.push(child3);

  // Create child with name "Beta", display_order 25
  const child4: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: "Beta",
        slug: `beta-${RandomGenerator.alphaNumeric(8)}`,
        description: "Beta category",
        display_order: 25,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(child4);
  childCategories.push(child4);

  // Step 4: Test name sorting - ascending
  const nameSortAsc: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        sort_by: "name",
        sort_direction: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(nameSortAsc);

  const expectedNameAsc = [...childCategories].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  TestValidator.equals(
    "name ascending sort order",
    nameSortAsc.data.map((c) => c.id),
    expectedNameAsc.map((c) => c.id),
  );

  // Step 5: Test name sorting - descending
  const nameSortDesc: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        sort_by: "name",
        sort_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(nameSortDesc);

  const expectedNameDesc = [...childCategories].sort((a, b) =>
    b.name.localeCompare(a.name),
  );
  TestValidator.equals(
    "name descending sort order",
    nameSortDesc.data.map((c) => c.id),
    expectedNameDesc.map((c) => c.id),
  );

  // Step 6: Test created_at sorting - ascending
  const createdAtSortAsc: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        sort_by: "created_at",
        sort_direction: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(createdAtSortAsc);

  const expectedCreatedAtAsc = [...childCategories].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  TestValidator.equals(
    "created_at ascending sort order",
    createdAtSortAsc.data.map((c) => c.id),
    expectedCreatedAtAsc.map((c) => c.id),
  );

  // Step 7: Test created_at sorting - descending
  const createdAtSortDesc: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        sort_by: "created_at",
        sort_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(createdAtSortDesc);

  const expectedCreatedAtDesc = [...childCategories].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  TestValidator.equals(
    "created_at descending sort order",
    createdAtSortDesc.data.map((c) => c.id),
    expectedCreatedAtDesc.map((c) => c.id),
  );

  // Step 8: Test display_order sorting - ascending
  const displayOrderSortAsc: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        sort_by: "display_order",
        sort_direction: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(displayOrderSortAsc);

  const expectedDisplayOrderAsc = [...childCategories].sort(
    (a, b) => a.display_order - b.display_order,
  );
  TestValidator.equals(
    "display_order ascending sort order",
    displayOrderSortAsc.data.map((c) => c.id),
    expectedDisplayOrderAsc.map((c) => c.id),
  );

  // Step 9: Test display_order sorting - descending
  const displayOrderSortDesc: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        sort_by: "display_order",
        sort_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(displayOrderSortDesc);

  const expectedDisplayOrderDesc = [...childCategories].sort(
    (a, b) => b.display_order - a.display_order,
  );
  TestValidator.equals(
    "display_order descending sort order",
    displayOrderSortDesc.data.map((c) => c.id),
    expectedDisplayOrderDesc.map((c) => c.id),
  );

  // Step 10: Verify pagination works with sorting
  const paginatedSort: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        sort_by: "name",
        sort_direction: "asc",
        page: 1,
        limit: 2,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(paginatedSort);

  TestValidator.equals(
    "pagination limit is respected",
    paginatedSort.data.length,
    2,
  );
  TestValidator.predicate(
    "first page starts with first sorted item",
    paginatedSort.data[0].id === expectedNameAsc[0].id,
  );
}
