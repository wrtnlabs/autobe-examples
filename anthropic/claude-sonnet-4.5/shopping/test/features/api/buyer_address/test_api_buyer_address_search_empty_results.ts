import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBuyerAddress";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test address search behavior when no addresses exist or when filters match no
 * records.
 *
 * This test validates that the API correctly handles empty result scenarios
 * with proper pagination metadata structure. The test will:
 *
 * 1. Create a new buyer account through registration
 * 2. Perform multiple address searches with different filters when no addresses
 *    exist
 * 3. Validate that all searches return empty data arrays with correct pagination
 *    metadata (0 records, 0 pages)
 * 4. Ensure the API maintains consistent response structure even when no results
 *    are found
 */
export async function test_api_buyer_address_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Perform address search with no addresses created yet - empty body
  const emptySearch: IPageIShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {} satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(emptySearch);

  // Step 3: Validate empty result structure
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearch.data,
    [],
  );
  TestValidator.equals(
    "empty search has 0 records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search has 0 pages",
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search current page is 1",
    emptySearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "empty search has valid limit",
    emptySearch.pagination.limit >= 1,
  );

  // Step 4: Test search with filter for non-existent label
  const searchNonExistentLabel: IPageIShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          address_label: "NonExistentLabel123",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchNonExistentLabel);

  TestValidator.equals(
    "non-existent label search returns empty data",
    searchNonExistentLabel.data,
    [],
  );
  TestValidator.equals(
    "non-existent label search has 0 records",
    searchNonExistentLabel.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent label search has 0 pages",
    searchNonExistentLabel.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "non-existent label search has valid pagination",
    searchNonExistentLabel.pagination.current >= 1,
  );

  // Step 5: Test search with text query that matches nothing
  const searchNoMatch: IPageIShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          search: "XYZ999NoMatchText",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchNoMatch);

  TestValidator.equals(
    "no-match text search returns empty data",
    searchNoMatch.data,
    [],
  );
  TestValidator.equals(
    "no-match text search has 0 records",
    searchNoMatch.pagination.records,
    0,
  );
  TestValidator.equals(
    "no-match text search has 0 pages",
    searchNoMatch.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "no-match text search maintains structure",
    searchNoMatch.pagination.limit > 0,
  );

  // Step 6: Test search with address_type filter (residential)
  const searchResidential: IPageIShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          address_type: "residential",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchResidential);

  TestValidator.equals(
    "residential filter returns empty data",
    searchResidential.data,
    [],
  );
  TestValidator.equals(
    "residential filter has 0 records",
    searchResidential.pagination.records,
    0,
  );
  TestValidator.equals(
    "residential filter has 0 pages",
    searchResidential.pagination.pages,
    0,
  );

  // Step 7: Test search with address_type filter (commercial)
  const searchCommercial: IPageIShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          address_type: "commercial",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchCommercial);

  TestValidator.equals(
    "commercial filter returns empty data",
    searchCommercial.data,
    [],
  );
  TestValidator.equals(
    "commercial filter has 0 records",
    searchCommercial.pagination.records,
    0,
  );
  TestValidator.predicate(
    "commercial filter maintains pagination structure",
    searchCommercial.pagination.pages === 0,
  );

  // Step 8: Test search with is_default filter set to true
  const searchDefault: IPageIShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchDefault);

  TestValidator.equals(
    "default filter returns empty data",
    searchDefault.data,
    [],
  );
  TestValidator.equals(
    "default filter has 0 records",
    searchDefault.pagination.records,
    0,
  );
  TestValidator.equals(
    "default filter has 0 pages",
    searchDefault.pagination.pages,
    0,
  );

  // Step 9: Test search with is_default filter set to false
  const searchNonDefault: IPageIShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          is_default: false,
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchNonDefault);

  TestValidator.equals(
    "non-default filter returns empty data",
    searchNonDefault.data,
    [],
  );
  TestValidator.equals(
    "non-default filter has 0 records",
    searchNonDefault.pagination.records,
    0,
  );
  TestValidator.predicate(
    "non-default filter maintains pagination structure",
    searchNonDefault.pagination.pages === 0,
  );

  // Step 10: Test search with pagination parameters
  const searchWithPagination: IPageIShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchWithPagination);

  TestValidator.equals(
    "pagination search returns empty data",
    searchWithPagination.data,
    [],
  );
  TestValidator.equals(
    "pagination search has 0 records",
    searchWithPagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination search has 0 pages",
    searchWithPagination.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination search respects limit",
    searchWithPagination.pagination.limit,
    10,
  );
}
