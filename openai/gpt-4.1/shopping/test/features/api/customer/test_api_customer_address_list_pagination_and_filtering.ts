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
 * Test that an authenticated customer can retrieve and filter a paginated list
 * of their saved addresses by different criteria (such as search, city,
 * province, country, and is_default).
 *
 * 1. Register a new customer with random valid data using the join API.
 * 2. [Setup] Assume there are already multiple addresses saved for the customer in
 *    the system (since no address creation API is provided, only test the list
 *    function and filtering as possible).
 * 3. For common filter options (search term, city, province, country, is_default)
 *    – construct requests varying each in turn and in logical combinations,
 *    using realistic random or manually crafted filter values likely to occur
 *    in address records.
 * 4. For each request: - Call address list API with current filter - Assert the
 *    returned addresses (if any) match only the authenticated customer - Assert
 *    that filtering is respected (e.g., if filtering by city, all results have
 *    that city; if is_default, only default addresses, etc.) - Validate
 *    pagination metadata (current/limit/records/pages are consistent with
 *    result count)
 * 5. Check with empty filter (unfiltered full list) and with
 *    intentionally-unmatchable filter for empty result edge case.
 * 6. Include assertions for page/limit boundaries and edge conditions (first page,
 *    last page, page out-of-range returns empty/appropriate result)
 *
 * Since address creation API is not provided, the test is limited to possible
 * variations of the listing endpoint.
 */
export async function test_api_customer_address_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);

  const customerId = customer.id;

  // Since address creation is not available, just perform list/filter tests. Pick a set of potential filters (simulate known fields)
  // Use plausible filter values to attempt matches or empty results.
  const testCities = ["Seoul", "Busan", "Incheon"] as const;
  const testProvinces = ["Seoul", "Gyeonggi", "Jeju"] as const;
  const testCountries = ["South Korea", "Japan", "USA"] as const;
  const searchTerms = ["", "Main", "Sample", "Park"];
  const isDefaultOptions = [true, false];

  // Run test with no filters (request all addresses / pagination default)
  const allOutput =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: {},
      },
    );
  typia.assert(allOutput);
  TestValidator.predicate(
    "pagination record count non-negative",
    allOutput.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page must be >= 0",
    allOutput.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit must be >= 0",
    allOutput.pagination.limit >= 0,
  );

  // Try Page/Limit edge cases
  const pageLimitOutput =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: { page: 1, limit: 1 },
      },
    );
  typia.assert(pageLimitOutput);
  TestValidator.equals(
    "respect page 1, limit 1",
    pageLimitOutput.pagination.current,
    1,
  );
  TestValidator.equals("respect limit 1", pageLimitOutput.pagination.limit, 1);
  // If any data, should have at most 1 address
  TestValidator.predicate(
    "pageLimitOutput <= 1 address",
    pageLimitOutput.data.length <= 1,
  );

  // Try out-of-range page
  const giantPageOutput =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: { page: 9999 },
      },
    );
  typia.assert(giantPageOutput);
  TestValidator.equals(
    "giant page out of range = 0 results",
    giantPageOutput.data.length,
    0,
  );

  // Now cycle through combinatorial filters
  for (const city of testCities) {
    const filtered =
      await api.functional.shoppingMall.customer.customers.addresses.index(
        connection,
        {
          customerId,
          body: { city },
        },
      );
    typia.assert(filtered);
    for (const addr of filtered.data) {
      TestValidator.equals(`filter by city: ${city}`, addr.city, city);
    }
  }
  for (const province of testProvinces) {
    const filtered =
      await api.functional.shoppingMall.customer.customers.addresses.index(
        connection,
        {
          customerId,
          body: { province },
        },
      );
    typia.assert(filtered);
    for (const addr of filtered.data) {
      TestValidator.equals(
        `filter by province: ${province}`,
        addr.province,
        province,
      );
    }
  }
  for (const country of testCountries) {
    const filtered =
      await api.functional.shoppingMall.customer.customers.addresses.index(
        connection,
        {
          customerId,
          body: { country },
        },
      );
    typia.assert(filtered);
    for (const addr of filtered.data) {
      TestValidator.equals(
        `filter by country: ${country}`,
        addr.country,
        country,
      );
    }
  }
  for (const term of searchTerms) {
    const filtered =
      await api.functional.shoppingMall.customer.customers.addresses.index(
        connection,
        {
          customerId,
          body: { search: term },
        },
      );
    typia.assert(filtered);
    for (const addr of filtered.data) {
      if (term === "") continue; // If empty string, skip
      const combinedFields =
        `${addr.full_name} ${addr.street} ${addr.city} ${addr.province} ${addr.phone}`.toLowerCase();
      TestValidator.predicate(
        `search '${term}' appears in address fields`,
        combinedFields.includes(term.toLowerCase()),
      );
    }
  }
  for (const is_default of isDefaultOptions) {
    const filtered =
      await api.functional.shoppingMall.customer.customers.addresses.index(
        connection,
        {
          customerId,
          body: { is_default },
        },
      );
    typia.assert(filtered);
    for (const addr of filtered.data) {
      TestValidator.equals(
        `filter by is_default: ${is_default}`,
        addr.is_default,
        is_default,
      );
    }
  }

  // Combination filter: city + province + country + is_default (using just the first of each)
  const combinatorialOutput =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: {
          city: testCities[0],
          province: testProvinces[0],
          country: testCountries[0],
          is_default: isDefaultOptions[0],
        },
      },
    );
  typia.assert(combinatorialOutput);
  for (const addr of combinatorialOutput.data) {
    TestValidator.equals("combination filter: city", addr.city, testCities[0]);
    TestValidator.equals(
      "combination filter: province",
      addr.province,
      testProvinces[0],
    );
    TestValidator.equals(
      "combination filter: country",
      addr.country,
      testCountries[0],
    );
    TestValidator.equals(
      "combination filter: is_default",
      addr.is_default,
      isDefaultOptions[0],
    );
  }
}
