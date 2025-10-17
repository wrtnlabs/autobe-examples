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
 * This test validates the public endpoint for retrieving filtered and paginated
 * shopping mall categories.
 *
 * Steps:
 *
 * 1. Register an admin user to authenticate admin operations.
 * 2. Create a parent category to enable search by existing parent_id.
 * 3. Test the category listing endpoint with pagination and filters:
 *
 *    - Search by 'search' keyword in code or name.
 *    - Filter by 'parent_id' to check hierarchical filtering.
 *    - Sort by display_order ascending and descending.
 * 4. Validate response pagination and data correctness.
 *
 * This test ensures category search and pagination behave as expected with no
 * authentication required for listing.
 */
export async function test_api_shopping_mall_category_filtered_pagination_public(
  connection: api.IConnection,
) {
  // 1. Perform admin join for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a parent category
  const parentCategoryCode: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  })
    .replace(/\s/g, "_")
    .toLowerCase();
  const parentCategoryName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });
  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          code: parentCategoryCode,
          name: parentCategoryName,
          description: "Parent category for E2E test",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number as number,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);

  // 3. Prepare input for category index endpoint
  const indexRequestDefault = {
    page: 1,
    limit: 5,
  } satisfies IShoppingMallCategory.IRequest;

  // 4. Call category index with default pagination
  const pageDefault: IPageIShoppingMallCategory =
    await api.functional.shoppingMall.shoppingMall.categories.index(
      connection,
      { body: indexRequestDefault },
    );
  typia.assert(pageDefault);
  TestValidator.predicate(
    "pagination current page number valid",
    pageDefault.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    pageDefault.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination total pages positive",
    pageDefault.pagination.pages > 0,
  );

  // 5. Call category index with parent_id filter
  const indexRequestParentFilter = {
    parent_id: parentCategory.id,
    page: 1,
    limit: 5,
  } satisfies IShoppingMallCategory.IRequest;
  const pageFilteredParent: IPageIShoppingMallCategory =
    await api.functional.shoppingMall.shoppingMall.categories.index(
      connection,
      { body: indexRequestParentFilter },
    );
  typia.assert(pageFilteredParent);
  // All returned categories must have parent_id equal to parentCategory.id
  for (const cat of pageFilteredParent.data) {
    TestValidator.equals(
      "category parent_id filter",
      cat.parent_id,
      parentCategory.id,
    );
  }

  // 6. Call category index with search filtering by partial code or name
  // Use substring from parentCategoryCode or parentCategoryName
  const searchKeyword = parentCategoryCode.substr(
    0,
    Math.min(3, parentCategoryCode.length),
  );
  const indexRequestSearchFilter = {
    search: searchKeyword,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCategory.IRequest;
  const pageFilteredSearch: IPageIShoppingMallCategory =
    await api.functional.shoppingMall.shoppingMall.categories.index(
      connection,
      { body: indexRequestSearchFilter },
    );
  typia.assert(pageFilteredSearch);
  // Validate search keyword present in code or name
  for (const cat of pageFilteredSearch.data) {
    TestValidator.predicate(
      "category search filter in code or name",
      cat.code.includes(searchKeyword) || cat.name.includes(searchKeyword),
    );
  }

  // 7. Call category index sorted ascending by display_order
  const indexRequestSortAsc = {
    sort: "asc",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCategory.IRequest;
  const pageSortedAsc: IPageIShoppingMallCategory =
    await api.functional.shoppingMall.shoppingMall.categories.index(
      connection,
      { body: indexRequestSortAsc },
    );
  typia.assert(pageSortedAsc);
  // Validate ascending order
  for (let i = 0; i + 1 < pageSortedAsc.data.length; i++) {
    TestValidator.predicate(
      "display_order ascending",
      pageSortedAsc.data[i].display_order <=
        pageSortedAsc.data[i + 1].display_order,
    );
  }

  // 8. Call category index sorted descending by display_order
  const indexRequestSortDesc = {
    sort: "desc",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCategory.IRequest;
  const pageSortedDesc: IPageIShoppingMallCategory =
    await api.functional.shoppingMall.shoppingMall.categories.index(
      connection,
      { body: indexRequestSortDesc },
    );
  typia.assert(pageSortedDesc);
  // Validate descending order
  for (let i = 0; i + 1 < pageSortedDesc.data.length; i++) {
    TestValidator.predicate(
      "display_order descending",
      pageSortedDesc.data[i].display_order >=
        pageSortedDesc.data[i + 1].display_order,
    );
  }
}
