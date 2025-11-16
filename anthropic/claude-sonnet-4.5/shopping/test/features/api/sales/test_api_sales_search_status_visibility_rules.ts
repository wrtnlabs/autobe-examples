import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product status filtering and visibility rules for unauthenticated
 * access.
 *
 * This test validates that the product search API correctly enforces visibility
 * rules based on product status when accessed without authentication. The test
 * verifies that:
 *
 * 1. Unauthenticated searches by default return only published products
 * 2. Explicit filtering for published status works correctly
 * 3. Attempting to filter by non-public statuses (draft, pending_approval,
 *    suspended, archived) does not expose those products to unauthenticated
 *    users
 * 4. Products with non-public statuses are excluded from results even when
 *    matching other filter criteria
 *
 * This ensures proper access control and data privacy in the marketplace,
 * preventing unauthenticated users from viewing products that are not ready for
 * public consumption or have been removed from public view.
 */
export async function test_api_sales_search_status_visibility_rules(
  connection: api.IConnection,
) {
  // Step 1: Search without status filter - should return only published products by default
  const defaultSearchResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(defaultSearchResult);

  // Verify all returned products have published status
  TestValidator.predicate(
    "default search returns only published products",
    defaultSearchResult.data.every((product) => product.status === "published"),
  );

  // Step 2: Explicit search for published status - should work correctly
  const publishedSearchResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "published",
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(publishedSearchResult);

  // Verify all returned products are published
  TestValidator.predicate(
    "explicit published filter returns only published products",
    publishedSearchResult.data.every(
      (product) => product.status === "published",
    ),
  );

  // Step 3: Attempt to filter by draft status - should return empty or only published
  const draftSearchResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "draft",
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(draftSearchResult);

  // Verify no draft products are exposed to unauthenticated users
  TestValidator.predicate(
    "draft status filter does not expose draft products",
    draftSearchResult.data.every((product) => product.status === "published"),
  );

  // Step 4: Attempt to filter by pending_approval status
  const pendingSearchResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "pending_approval",
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(pendingSearchResult);

  // Verify no pending_approval products are exposed
  TestValidator.predicate(
    "pending_approval status filter does not expose pending products",
    pendingSearchResult.data.every((product) => product.status === "published"),
  );

  // Step 5: Attempt to filter by suspended status
  const suspendedSearchResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "suspended",
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(suspendedSearchResult);

  // Verify no suspended products are exposed
  TestValidator.predicate(
    "suspended status filter does not expose suspended products",
    suspendedSearchResult.data.every(
      (product) => product.status === "published",
    ),
  );

  // Step 6: Attempt to filter by archived status
  const archivedSearchResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "archived",
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(archivedSearchResult);

  // Verify no archived products are exposed
  TestValidator.predicate(
    "archived status filter does not expose archived products",
    archivedSearchResult.data.every(
      (product) => product.status === "published",
    ),
  );

  // Step 7: Test with additional filters to ensure status restriction applies
  const complexFilterResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "suspended",
        min_price: 0,
        condition: "new",
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(complexFilterResult);

  // Verify suspended products are excluded even with matching filter criteria
  TestValidator.predicate(
    "suspended products excluded even with matching filters",
    complexFilterResult.data.every((product) => product.status === "published"),
  );

  // Step 8: Verify pagination works correctly with status filtering
  const paginatedResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "published",
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(paginatedResult);

  // Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination current page is correct",
    paginatedResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit is correct",
    paginatedResult.pagination.limit === 10,
  );

  TestValidator.predicate(
    "pagination metadata is consistent",
    paginatedResult.pagination.records >= 0 &&
      paginatedResult.pagination.pages >= 0,
  );
}
