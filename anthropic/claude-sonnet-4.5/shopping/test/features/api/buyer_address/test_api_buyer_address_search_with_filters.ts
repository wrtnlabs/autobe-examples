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
 * Test comprehensive address search functionality with various filter
 * combinations.
 *
 * This test validates the buyer address search endpoint's ability to filter,
 * paginate, and sort addresses using multiple criteria. It creates a buyer
 * account, populates the address book with diverse test addresses, and verifies
 * that filtering by address_type, address_label, is_default status, text
 * search, pagination, and sorting all work correctly both individually and in
 * combination.
 *
 * Test Steps:
 *
 * 1. Create and authenticate buyer account
 * 2. Create multiple test addresses with varied attributes
 * 3. Test filtering by address_type (residential/commercial)
 * 4. Test filtering by address_label
 * 5. Test filtering by is_default status
 * 6. Test text search across recipient names and locations
 * 7. Test pagination with different limit and page parameters
 * 8. Test sorting with different sort_by and sort_order combinations
 * 9. Test multiple simultaneous filter criteria
 * 10. Validate pagination metadata accuracy
 * 11. Test edge case: search with no results
 */
export async function test_api_buyer_address_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Step 2: Create multiple test addresses with varied attributes
  const testAddresses = [
    {
      recipient_name: "John Doe",
      phone: RandomGenerator.mobile(),
      street_address_line1: "123 Main Street",
      street_address_line2: "Apt 4B",
      city: "New York",
      state: "NY",
      postal_code: "10001",
      country: "United States",
      address_label: "Home",
      address_type: "residential",
      is_default: true,
    } satisfies IShoppingMallBuyerAddress.ICreate,
    {
      recipient_name: "John Doe",
      phone: RandomGenerator.mobile(),
      street_address_line1: "456 Business Ave",
      city: "New York",
      state: "NY",
      postal_code: "10002",
      country: "United States",
      address_label: "Office",
      address_type: "commercial",
      is_default: false,
    } satisfies IShoppingMallBuyerAddress.ICreate,
    {
      recipient_name: "Jane Smith",
      phone: RandomGenerator.mobile(),
      street_address_line1: "789 Vacation Road",
      city: "Los Angeles",
      state: "CA",
      postal_code: "90001",
      country: "United States",
      address_label: "Vacation",
      address_type: "residential",
      is_default: false,
    } satisfies IShoppingMallBuyerAddress.ICreate,
    {
      recipient_name: "Robert Johnson",
      phone: RandomGenerator.mobile(),
      street_address_line1: "321 Commerce Blvd",
      city: "Chicago",
      state: "IL",
      postal_code: "60601",
      country: "United States",
      address_label: "Office",
      address_type: "commercial",
      is_default: false,
    } satisfies IShoppingMallBuyerAddress.ICreate,
    {
      recipient_name: "Mary Wilson",
      phone: RandomGenerator.mobile(),
      street_address_line1: "555 Family Lane",
      city: "Boston",
      state: "MA",
      postal_code: "02101",
      country: "United States",
      address_label: "Parent's House",
      address_type: "residential",
      is_default: false,
    } satisfies IShoppingMallBuyerAddress.ICreate,
    {
      recipient_name: "David Brown",
      phone: RandomGenerator.mobile(),
      street_address_line1: "888 Corporate Drive",
      city: "San Francisco",
      state: "CA",
      postal_code: "94101",
      country: "United States",
      address_label: "Office",
      address_type: "commercial",
      is_default: false,
    } satisfies IShoppingMallBuyerAddress.ICreate,
  ];

  const createdAddresses: IShoppingMallBuyerAddress[] = [];
  for (const addressData of testAddresses) {
    const address =
      await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
        connection,
        {
          body: addressData,
        },
      );
    typia.assert(address);
    createdAddresses.push(address);
  }

  // Step 3: Test filtering by address_type - residential
  const residentialResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          address_type: "residential",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(residentialResult);

  const residentialCount = testAddresses.filter(
    (a) => a.address_type === "residential",
  ).length;
  TestValidator.equals(
    "residential address count",
    residentialResult.data.length,
    residentialCount,
  );
  TestValidator.predicate(
    "all addresses are residential",
    residentialResult.data.every((a) => a.address_type === "residential"),
  );

  // Step 4: Test filtering by address_type - commercial
  const commercialResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          address_type: "commercial",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(commercialResult);

  const commercialCount = testAddresses.filter(
    (a) => a.address_type === "commercial",
  ).length;
  TestValidator.equals(
    "commercial address count",
    commercialResult.data.length,
    commercialCount,
  );
  TestValidator.predicate(
    "all addresses are commercial",
    commercialResult.data.every((a) => a.address_type === "commercial"),
  );

  // Step 5: Test filtering by address_label
  const officeResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          address_label: "Office",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(officeResult);

  const officeCount = testAddresses.filter(
    (a) => a.address_label === "Office",
  ).length;
  TestValidator.equals(
    "office label count",
    officeResult.data.length,
    officeCount,
  );
  TestValidator.predicate(
    "all addresses have Office label",
    officeResult.data.every((a) => a.address_label === "Office"),
  );

  // Step 6: Test filtering by is_default status
  const defaultResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(defaultResult);

  TestValidator.predicate(
    "only one default address",
    defaultResult.data.length === 1,
  );
  TestValidator.predicate(
    "default address flag is true",
    defaultResult.data.every((a) => a.is_default === true),
  );

  // Step 7: Test text search across recipient names
  const searchJohnResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          search: "John",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchJohnResult);

  TestValidator.predicate(
    "search results contain John",
    searchJohnResult.data.every(
      (a) =>
        a.recipient_name.includes("John") ||
        a.street_address_line1.includes("John") ||
        a.city.includes("John"),
    ),
  );

  // Step 8: Test text search across locations
  const searchNewYorkResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          search: "New York",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchNewYorkResult);

  const newYorkCount = testAddresses.filter(
    (a) => a.city === "New York",
  ).length;
  TestValidator.equals(
    "New York city count",
    searchNewYorkResult.data.length,
    newYorkCount,
  );

  // Step 9: Test pagination with limit
  const paginatedResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          page: 1,
          limit: 3,
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(paginatedResult);

  TestValidator.equals(
    "pagination limit applied",
    paginatedResult.data.length,
    3,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedResult.pagination.limit, 3);
  TestValidator.equals(
    "pagination total records",
    paginatedResult.pagination.records,
    createdAddresses.length,
  );

  // Step 10: Test sorting by created_at descending (default)
  const sortedDescResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(sortedDescResult);

  TestValidator.predicate(
    "addresses sorted by created_at desc",
    sortedDescResult.data.length > 1 &&
      new Date(sortedDescResult.data[0].created_at).getTime() >=
        new Date(sortedDescResult.data[1].created_at).getTime(),
  );

  // Step 11: Test sorting by recipient_name ascending
  const sortedNameAscResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          sort_by: "recipient_name",
          sort_order: "asc",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(sortedNameAscResult);

  TestValidator.predicate(
    "addresses sorted by recipient_name asc",
    sortedNameAscResult.data.length > 1 &&
      sortedNameAscResult.data[0].recipient_name <=
        sortedNameAscResult.data[1].recipient_name,
  );

  // Step 12: Test sorting by city ascending
  const sortedCityAscResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          sort_by: "city",
          sort_order: "asc",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(sortedCityAscResult);

  TestValidator.predicate(
    "addresses sorted by city asc",
    sortedCityAscResult.data.length > 1 &&
      sortedCityAscResult.data[0].city <= sortedCityAscResult.data[1].city,
  );

  // Step 13: Test multiple simultaneous filter criteria
  const multiFilterResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          address_type: "commercial",
          address_label: "Office",
          sort_by: "city",
          sort_order: "asc",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(multiFilterResult);

  TestValidator.predicate(
    "multi-filter results match all criteria",
    multiFilterResult.data.every(
      (a) => a.address_type === "commercial" && a.address_label === "Office",
    ),
  );

  // Step 14: Test edge case - search with no results
  const noResultsSearch =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          search: "NonExistentSearchTerm12345",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(noResultsSearch);

  TestValidator.equals(
    "no results for non-matching search",
    noResultsSearch.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records zero for no results",
    noResultsSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages zero for no results",
    noResultsSearch.pagination.pages,
    0,
  );

  // Step 15: Test pagination - second page
  const secondPageResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          page: 2,
          limit: 3,
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(secondPageResult);

  TestValidator.equals(
    "second page current",
    secondPageResult.pagination.current,
    2,
  );
  const expectedSecondPageSize = Math.min(3, createdAddresses.length - 3);
  TestValidator.equals(
    "second page data size",
    secondPageResult.data.length,
    expectedSecondPageSize,
  );
}
