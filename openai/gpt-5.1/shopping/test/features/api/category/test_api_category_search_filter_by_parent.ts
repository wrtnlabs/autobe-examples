import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Filter categories by parent and ensure only direct children are returned.
 *
 * Business goals:
 *
 * - Validate that the public PATCH /shoppingMall/categories endpoint correctly
 *   respects the parent_id filter to return only direct children categories.
 * - Ensure that the endpoint is publicly accessible (no authentication or special
 *   headers required).
 * - Confirm that pagination metadata remains logically consistent when a parent
 *   filter is applied.
 *
 * High level flow:
 *
 * 1. Call PATCH /shoppingMall/categories without parent_id to obtain a baseline
 *    page of categories (page 1, with a reasonable limit).
 * 2. From the baseline page, select a category that actually has at least one
 *    child. To do this, run another PATCH query with parent_id set to a
 *    candidate category.id and check whether it returns any records.
 *
 *    - Iterate through baseline categories until finding a parent with at least one
 *         child; fall back to a simple sanity check when no such parent is
 *         found.
 * 3. Once a parent P with children is found, re-query PATCH
 *    /shoppingMall/categories with body.parent_id = P.id.
 * 4. Assert that every returned category has parent_id equal to P.id.
 * 5. Assert that no category whose parent_id differs from P.id appears in the
 *    result.
 * 6. Validate that pagination metadata is sane (limit matches requested limit,
 *    pages calculation consistent with records and limit) under the filtered
 *    view.
 */
export async function test_api_category_search_filter_by_parent(
  connection: api.IConnection,
) {
  // 1. Fetch a baseline page of categories without any parent filter.
  const baselineLimit = 20 as number;
  const baselineRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: baselineLimit as number & tags.Type<"int32">,
    parent_id: null,
    status: null,
    is_leaf: null,
    search: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallCategory.IRequest;

  const baselinePage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: baselineRequest,
    });
  typia.assert(baselinePage);

  const baselineCategories = baselinePage.data;

  // Sanity assertion: baseline pagination must be consistent
  const baselinePagination = baselinePage.pagination;
  TestValidator.predicate(
    "baseline limit should be positive",
    () => baselinePagination.limit > 0,
  );

  // 2. Find a parent category that actually has at least one child.
  // We iterate through baseline categories and use a child query with
  // parent_id = candidate.id and limit=1 to check for existence of children.
  let parentWithChildren: IShoppingMallCategory.ISummary | null = null;
  let childrenOfParent: IShoppingMallCategory.ISummary[] = [];
  for (const candidate of baselineCategories) {
    const childProbeRequest = {
      page: 1 as number & tags.Type<"int32">,
      limit: 1 as number & tags.Type<"int32">,
      parent_id: candidate.id,
      status: null,
      is_leaf: null,
      search: null,
      order_by: null,
      order_direction: null,
    } satisfies IShoppingMallCategory.IRequest;

    const childProbePage: IPageIShoppingMallCategory.ISummary =
      await api.functional.shoppingMall.categories.index(connection, {
        body: childProbeRequest,
      });
    typia.assert(childProbePage);

    if (childProbePage.data.length > 0) {
      parentWithChildren = candidate;
      childrenOfParent = childProbePage.data;
      break;
    }
  }

  // If no parent with children is found in the baseline set, we still
  // perform a weaker assertion: parent_id filter should not break the API
  // and should return categories (or 0 records) consistently for some
  // existing category's id.
  if (parentWithChildren === null) {
    if (baselineCategories.length === 0) {
      // No categories at all: just assert that we could at least call the
      // endpoint with a null parent_id and get an empty-but-valid structure.
      TestValidator.equals(
        "baseline has no data and zero records",
        baselinePagination.records,
        0,
      );
      return;
    }

    const fallbackParent = baselineCategories[0];
    const filteredFallbackRequest = {
      page: 1 as number & tags.Type<"int32">,
      limit: baselineLimit as number & tags.Type<"int32">,
      parent_id: fallbackParent.id,
      status: null,
      is_leaf: null,
      search: null,
      order_by: null,
      order_direction: null,
    } satisfies IShoppingMallCategory.IRequest;

    const filteredFallbackPage: IPageIShoppingMallCategory.ISummary =
      await api.functional.shoppingMall.categories.index(connection, {
        body: filteredFallbackRequest,
      });
    typia.assert(filteredFallbackPage);

    // Even in this degenerate case, ensure the API returns a valid page and
    // does not include any category whose parent_id is different from the
    // requested one (if any data is returned at all).
    for (const category of filteredFallbackPage.data) {
      TestValidator.equals(
        "all fallback-filtered categories must have requested parent_id",
        category.parent_id,
        fallbackParent.id,
      );
    }

    // Basic pagination sanity under filtered view.
    const pag = filteredFallbackPage.pagination;
    TestValidator.predicate(
      "filtered fallback limit should be positive",
      () => pag.limit > 0,
    );
    return;
  }

  // 3. We have a parent with at least one child. Now request a full page of
  // children for this parent using a consistent limit.
  const filteredRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: baselineLimit as number & tags.Type<"int32">,
    parent_id: parentWithChildren.id,
    status: null,
    is_leaf: null,
    search: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallCategory.IRequest;

  const filteredPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: filteredRequest,
    });
  typia.assert(filteredPage);

  const filteredCategories = filteredPage.data;
  const filteredPagination = filteredPage.pagination;

  // 4. Assert that all returned categories have parent_id equal to the
  // selected parent.
  for (const category of filteredCategories) {
    TestValidator.equals(
      "all filtered categories must have requested parent_id",
      category.parent_id,
      parentWithChildren.id,
    );
  }

  // 5. Ensure no categories whose parent_id differs from the requested one
  // are present. This is implicitly covered by the equality assertion above,
  // but we keep a predicate to emphasize the business rule.
  await TestValidator.predicate(
    "no category with different parent_id appears in filtered results",
    async () =>
      filteredCategories.every(
        (category) => category.parent_id === parentWithChildren!.id,
      ),
  );

  // 6. Pagination metadata sanity under filtered view.
  TestValidator.equals(
    "filtered limit should match requested limit",
    filteredPagination.limit,
    baselineLimit,
  );

  // When there are records, pages should be consistent with records and limit.
  if (filteredPagination.records > 0 && filteredPagination.limit > 0) {
    const expectedPages = Math.ceil(
      filteredPagination.records / filteredPagination.limit,
    );
    TestValidator.equals(
      "filtered pages should equal ceil(records/limit)",
      filteredPagination.pages,
      expectedPages,
    );
  }
}
