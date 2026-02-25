import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

export async function test_api_customer_address_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create customer actor connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Register customer account
  const customerCredentials = {
    email: (typia.random<string & tags.Format<"email">>() satisfies string & tags.Format<"email">) as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
    password: "12345678",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(customer);
  // Generate multiple test addresses with various search terms
  const addressCount = 15;
  const addresses = ArrayUtil.repeat(addressCount, (index) => ({
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: `${Math.floor(Math.random() * 900) + 100} ${RandomGenerator.alphabets(5)} Street`,
    city: RandomGenerator.name(),
    state: RandomGenerator.alphabets(2).toUpperCase(),
    postal_code: String(Math.floor(Math.random() * 90000) + 10000),
    country: "United States",
  }));
  // Create addresses for testing pagination and search
  for (const address of addresses) {
    const created = await api.functional.shoppingMall.customer.addresses.create(
      customerConnection,
      {
        body: address satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
    typia.assert(created);
  }
  // Test 1: Pagination with different page sizes
  // Page 1 with limit 5
  const page1 = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 has 5 records", page1.data.length, 5);
  TestValidator.equals(
    "page 1 pagination current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination limit", page1.pagination.limit, 5);
  TestValidator.equals(
    "page 1 pagination records",
    page1.pagination.records,
    addressCount,
  );
  TestValidator.equals("page 1 pagination pages", page1.pagination.pages, 3); // ceil(15/5) = 3
  // Page 2 with limit 5
  const page2 = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.notEquals("page 1 and 2 data differ", page1.data, page2.data);
  // Page 3 with limit 5 (last page, should have 5 records)
  const page3 = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 3,
        limit: 5,
      } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals("page 3 has 5 records", page3.data.length, 5);
  // Test 2: Search functionality
  const searchTerm = addresses[5].city; // Use existing city name for search
  const searchResults =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: searchTerm,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(searchResults);
  // Verify all results contain search term
  for (const address of searchResults.data) {
    TestValidator.predicate(
      "search term in city",
      (
        address.city +
        " " +
        address.street_address +
        " " +
        address.recipient_name +
        " " +
        address.phone_number
      )
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    );
  }
  // Test 3: Combined search and is_default filter
  // Set one address as default
  if (page1.data.length > 0) {
    const defaultAddress = page1.data[0];
    // Note: PATCH endpoint for updating default status not provided, so testing search only
  }
  // Test 4: Empty search results
  const emptySearch =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: "nonexistent_term_12345",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns no results",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pagination records",
    emptySearch.pagination.records,
    0,
  );
  // Test 5: Edge case - pagination when total records exactly match page limit
  const exactPage = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 15,
      } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(exactPage);
  TestValidator.equals("exact page has 15 records", exactPage.data.length, 15);
  TestValidator.equals(
    "exact page pagination pages",
    exactPage.pagination.pages,
    1,
  );
  // Test 6: Edge case - pagination when total records exceed page limit significantly
  const limit10 = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(limit10);
  TestValidator.equals("limit 10 page has 10 records", limit10.data.length, 10);
  TestValidator.equals(
    "limit 10 pagination pages",
    limit10.pagination.pages,
    2,
  ); // ceil(15/10) = 2
  // Test 7: Search by recipient name
  const nameSearchTerm = addresses[3].recipient_name;
  const nameSearchResults =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: nameSearchTerm,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(nameSearchResults);
  // Verify at least one result matches the name search
  const nameMatchFound = nameSearchResults.data.some((addr) =>
    addr.recipient_name.toLowerCase().includes(nameSearchTerm.toLowerCase()),
  );
  TestValidator.predicate(
    "name search finds at least one match",
    nameMatchFound,
  );
  // Test 8: Search by phone number
  const phoneSearchTerm = addresses[7].phone_number.substring(0, 5);
  const phoneSearchResults =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: phoneSearchTerm,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(phoneSearchResults);
  // Verify at least one result matches the phone search
  const phoneMatchFound = phoneSearchResults.data.some((addr) =>
    addr.phone_number.includes(phoneSearchTerm),
  );
  TestValidator.predicate(
    "phone search finds at least one match",
    phoneMatchFound,
  );
  // Test 9: Search by street address
  const streetSearchTerm = addresses[10].street_address.substring(0, 10);
  const streetSearchResults =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: streetSearchTerm,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(streetSearchResults);
  // Verify at least one result matches the street search
  const streetMatchFound = streetSearchResults.data.some((addr) =>
    addr.street_address.includes(streetSearchTerm),
  );
  TestValidator.predicate(
    "street search finds at least one match",
    streetMatchFound,
  );
  // Test 10: Combined filters (search term + pagination)
  const combinedSearch =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 3,
          search: searchTerm,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "combined search pagination",
    combinedSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "combined search has results",
    combinedSearch.data.length > 0,
  );
}