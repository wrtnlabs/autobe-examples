import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategoryHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategoryHierarchy";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryHierarchy";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_category_hierarchy_search_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins to get authenticated
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/test-join",
    referrer: "https://referrer.example.com/",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBody,
    });
  typia.assert(customer);

  // 2. Prepare payload for category hierarchy search
  const pageNumber: number & tags.Type<"int32"> & tags.Minimum<1> =
    1 satisfies number as number;
  const pageLimit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = 10 satisfies number as number;

  // Choose a realistic category name for test; using a random string simulating categoryName
  const categoryName: string = RandomGenerator.alphabets(6);

  const requestBody = {
    page: pageNumber,
    limit: pageLimit,
    searchTerm: null, // Explicitly searching without any text filter
    statusFilter: null, // No filter on status
    sortBy: "name", // Sorting by name ascending
    sortOrder: "asc",
  } satisfies IShoppingMallCategoryHierarchy.IRequest;

  // 3. Invoke the patch index API
  const output: IPageIShoppingMallCategoryHierarchy.ISummary =
    await api.functional.shoppingMall.customer.shoppingMallCategories.shoppingMallCategoryHierarchies.index(
      connection,
      {
        categoryName,
        body: requestBody,
      },
    );
  typia.assert(output);

  // 4. Business validation on pagination
  TestValidator.predicate(
    "pagination current page is as requested",
    output.pagination.current === pageNumber,
  );

  TestValidator.predicate(
    "pagination limit equals requested limit",
    output.pagination.limit === pageLimit,
  );

  TestValidator.predicate(
    "pagination page count is positive",
    output.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "pagination records count is not negative",
    output.pagination.records >= 0,
  );

  // 5. Validate items in the data are conforming to expected structure
  for (const hierarchy of output.data) {
    typia.assert(hierarchy);
    typia.assert(hierarchy.parent_category);
    typia.assert(hierarchy.child_category);

    // Validate parent and child category name non-empty
    TestValidator.predicate(
      `parent_category name is non-empty: ${hierarchy.parent_category.name}`,
      typeof hierarchy.parent_category.name === "string" &&
        hierarchy.parent_category.name.length > 0,
    );
    TestValidator.predicate(
      `child_category name is non-empty: ${hierarchy.child_category.name}`,
      typeof hierarchy.child_category.name === "string" &&
        hierarchy.child_category.name.length > 0,
    );

    // Validate status is string
    TestValidator.predicate(
      `parent_category status is defined string: ${hierarchy.parent_category.status}`,
      typeof hierarchy.parent_category.status === "string",
    );

    TestValidator.predicate(
      `created_at and updated_at have date-time strings: parent_category`,
      typeof hierarchy.parent_category.created_at === "string" &&
        typeof hierarchy.parent_category.updated_at === "string",
    );

    TestValidator.predicate(
      `created_at and updated_at have date-time strings: child_category`,
      typeof hierarchy.child_category.created_at === "string" &&
        typeof hierarchy.child_category.updated_at === "string",
    );
  }
}
