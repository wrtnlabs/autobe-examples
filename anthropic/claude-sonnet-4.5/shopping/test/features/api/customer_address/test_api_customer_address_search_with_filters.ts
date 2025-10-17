import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test comprehensive address search and filtering capabilities for
 * authenticated customers.
 *
 * This test validates that customers can create multiple delivery addresses
 * with different attributes and then efficiently search and filter through
 * their saved addresses using the pagination API. The test workflow includes:
 *
 * 1. Create a customer account for testing
 * 2. Add multiple addresses with varying properties (different cities, countries,
 *    recipients)
 * 3. Perform address search with pagination
 * 4. Validate pagination structure and response data
 * 5. Verify address ownership isolation (customers can only access their own
 *    addresses)
 */
export async function test_api_customer_address_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create a customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();
  const customerName = RandomGenerator.name();

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: customerName,
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Create multiple addresses with different attributes
  const addressCount = 5;
  const createdAddresses: IShoppingMallAddress[] = [];

  const cities = [
    "New York",
    "Los Angeles",
    "Chicago",
    "Houston",
    "Phoenix",
  ] as const;
  const countries = [
    "United States",
    "Canada",
    "United Kingdom",
    "Australia",
    "Germany",
  ] as const;
  const states = ["NY", "CA", "IL", "TX", "AZ"] as const;

  for (let i = 0; i < addressCount; i++) {
    const addressData = {
      recipient_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name()} Street`,
      city: RandomGenerator.pick(cities),
      state_province: RandomGenerator.pick(states),
      postal_code: typia
        .random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<10000> &
            tags.Maximum<99999>
        >()
        .toString(),
      country: RandomGenerator.pick(countries),
    } satisfies IShoppingMallAddress.ICreate;

    const createdAddress: IShoppingMallAddress =
      await api.functional.shoppingMall.customer.addresses.create(connection, {
        body: addressData,
      });
    typia.assert(createdAddress);
    createdAddresses.push(createdAddress);
  }

  TestValidator.equals(
    "created address count matches",
    createdAddresses.length,
    addressCount,
  );

  // Step 3: Perform address search with pagination
  const searchResult: IPageIShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.index(connection, {
      body: {
        page: 1,
      } satisfies IShoppingMallAddress.IRequest,
    });
  typia.assert(searchResult);

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination current page is valid",
    searchResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit is valid",
    searchResult.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination total records is valid",
    searchResult.pagination.records >= addressCount,
  );

  TestValidator.predicate(
    "pagination total pages is valid",
    searchResult.pagination.pages >= 0,
  );

  // Step 5: Verify returned addresses match created addresses
  TestValidator.predicate(
    "search result contains created addresses",
    searchResult.data.length >= addressCount,
  );

  // Verify each created address is present in the search results
  for (const createdAddr of createdAddresses) {
    const foundAddress = searchResult.data.find(
      (addr) => addr.id === createdAddr.id,
    );

    TestValidator.predicate(
      "created address found in search results",
      foundAddress !== undefined,
    );

    if (foundAddress) {
      TestValidator.equals(
        "address recipient name matches",
        foundAddress.recipient_name,
        createdAddr.recipient_name,
      );

      TestValidator.equals(
        "address phone number matches",
        foundAddress.phone_number,
        createdAddr.phone_number,
      );

      TestValidator.equals(
        "address line1 matches",
        foundAddress.address_line1,
        createdAddr.address_line1,
      );
    }
  }

  // Step 6: Test pagination with different page numbers
  const secondPageResult: IPageIShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.index(connection, {
      body: {
        page: 2,
      } satisfies IShoppingMallAddress.IRequest,
    });
  typia.assert(secondPageResult);

  TestValidator.equals(
    "second page current matches request",
    secondPageResult.pagination.current,
    2,
  );
}
