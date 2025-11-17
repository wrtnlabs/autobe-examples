import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function test_api_shopping_mall_category_list_retrieval(
  connection: api.IConnection,
) {
  // 1. Test without filters (default pagination)
  const defaultInput = {} satisfies IShoppingMallCategory.IRequest;
  const defaultResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.shoppingMallCategories.index(connection, {
      body: defaultInput,
    });
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default pagination returns valid page info",
    defaultResult.pagination.current >= 1 &&
      defaultResult.pagination.limit >= 1 &&
      defaultResult.pagination.pages >= 1 &&
      defaultResult.pagination.records >= 0,
  );

  // 2. Test filtering by partial name search
  // Pick a name substring from first result or generate random substring
  let searchKeyword: string | undefined;
  if (defaultResult.data.length > 0) {
    const firstName = defaultResult.data[0].name;
    searchKeyword =
      firstName.length > 2
        ? firstName.substring(0, Math.min(3, firstName.length))
        : firstName;
  } else {
    // fallback to generic term
    searchKeyword = "cat";
  }
  const searchInput = {
    ...defaultInput,
    search: searchKeyword,
  } satisfies IShoppingMallCategory.IRequest;
  const searchResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.shoppingMallCategories.index(connection, {
      body: searchInput,
    });
  typia.assert(searchResult);
  // Validate all results contain the search keyword in their name
  for (const category of searchResult.data) {
    TestValidator.predicate(
      `search filter name contains '${searchKeyword}' for id: ${category.id}`,
      category.name.includes(searchKeyword!),
    );
  }

  // 3. Test filtering by status
  // Pick a status from first defaultResult or use a common example
  let statusFilter: string | undefined;
  if (defaultResult.data.length > 0) {
    statusFilter = defaultResult.data[0].status;
  } else {
    statusFilter = "active";
  }
  const statusInput = {
    ...defaultInput,
    status: statusFilter,
  } satisfies IShoppingMallCategory.IRequest;
  const statusResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.shoppingMallCategories.index(connection, {
      body: statusInput,
    });
  typia.assert(statusResult);
  // Validate all results have status equal to statusFilter
  for (const category of statusResult.data) {
    TestValidator.equals(
      `status filter should be '${statusFilter}' for id: ${category.id}`,
      category.status,
      statusFilter!,
    );
  }

  // 4. Test filtering by creation date from
  // Collect a valid created_at_from from some result or use ISO date 2020-01-01T00:00:00.000Z
  let createdAtFrom: string | null | undefined = null;
  if (defaultResult.data.length > 0) {
    createdAtFrom = defaultResult.data[0].created_at ?? null;
  } else {
    createdAtFrom = "2020-01-01T00:00:00.000Z";
  }
  const dateFromInput = {
    ...defaultInput,
    created_at_from: createdAtFrom,
  } satisfies IShoppingMallCategory.IRequest;
  const dateFromResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.shoppingMallCategories.index(connection, {
      body: dateFromInput,
    });
  typia.assert(dateFromResult);
  // Validate all results have created_at >= createdAtFrom
  for (const category of dateFromResult.data) {
    if (category.created_at !== undefined && category.created_at !== null) {
      TestValidator.predicate(
        `created_at_from filter for id: ${category.id}`,
        category.created_at >= createdAtFrom!,
      );
    }
  }

  // 5. Test filtering by creation date to
  let createdAtTo: string | null | undefined = null;
  if (defaultResult.data.length > 0) {
    createdAtTo = defaultResult.data[0].created_at ?? null;
  } else {
    createdAtTo = new Date().toISOString();
  }
  const dateToInput = {
    ...defaultInput,
    created_at_to: createdAtTo,
  } satisfies IShoppingMallCategory.IRequest;
  const dateToResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.shoppingMallCategories.index(connection, {
      body: dateToInput,
    });
  typia.assert(dateToResult);
  // Validate all results have created_at <= createdAtTo
  for (const category of dateToResult.data) {
    if (category.created_at !== undefined && category.created_at !== null) {
      TestValidator.predicate(
        `created_at_to filter for id: ${category.id}`,
        category.created_at <= createdAtTo!,
      );
    }
  }

  // 6. Test filtering by both created_at_from and created_at_to
  const dateRangeInput = {
    ...defaultInput,
    created_at_from: createdAtFrom,
    created_at_to: createdAtTo,
  } satisfies IShoppingMallCategory.IRequest;
  const dateRangeResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.shoppingMallCategories.index(connection, {
      body: dateRangeInput,
    });
  typia.assert(dateRangeResult);
  for (const category of dateRangeResult.data) {
    if (category.created_at !== undefined && category.created_at !== null) {
      TestValidator.predicate(
        `created_at range filter for id: ${category.id}`,
        category.created_at >= (createdAtFrom ?? "") &&
          category.created_at <= (createdAtTo ?? "9999-12-31T23:59:59.999Z"),
      );
    }
  }

  // 7. Test pagination with page and limit parameters
  // Test with page 1, limit 1
  const page1Limit1Input = {
    ...defaultInput,
    page: 1,
    limit: 1,
  } satisfies IShoppingMallCategory.IRequest;
  const page1Limit1Result: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.shoppingMallCategories.index(connection, {
      body: page1Limit1Input,
    });
  typia.assert(page1Limit1Result);
  TestValidator.equals(
    "pagination current page is 1",
    page1Limit1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 1",
    page1Limit1Result.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination has at most 1 data element",
    page1Limit1Result.data.length <= 1,
  );

  // 8. Test pagination with page 2, limit 5
  const page2Limit5Input = {
    ...defaultInput,
    page: 2,
    limit: 5,
  } satisfies IShoppingMallCategory.IRequest;
  const page2Limit5Result: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.shoppingMallCategories.index(connection, {
      body: page2Limit5Input,
    });
  typia.assert(page2Limit5Result);
  TestValidator.equals(
    "pagination current page is 2",
    page2Limit5Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 5",
    page2Limit5Result.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination has at most 5 data elements",
    page2Limit5Result.data.length <= 5,
  );
}
