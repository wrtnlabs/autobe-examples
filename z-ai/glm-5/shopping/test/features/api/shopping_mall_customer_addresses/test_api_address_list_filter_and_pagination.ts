import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

export async function test_api_address_list_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create multiple addresses with varied countries and cities
  const addresses = await ArrayUtil.asyncRepeat(10, async (index) => {
    const countries = [
      "United States",
      "South Korea",
      "Japan",
      "Germany",
      "United Kingdom",
    ] as const;
    const cities = ["New York", "Seoul", "Tokyo", "Berlin", "London"] as const;
    const country = RandomGenerator.pick(countries);
    const city = RandomGenerator.pick(cities);
    return generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          country,
          city,
          recipient_name: `Recipient ${index}`,
          is_default: index === 0,
        },
      },
    );
  });
  // Verify all addresses created
  TestValidator.equals("all addresses created", addresses.length, 10);
  // 3. Test country filter (exact match)
  const countryToFilter = addresses[0].country;
  const countryFiltered =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          country: countryToFilter,
        } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(countryFiltered);
  TestValidator.predicate(
    "country filter exact match",
    countryFiltered.data.every((addr) => addr.country === countryToFilter),
  );
  // 4. Test city filter (exact match)
  const cityToFilter = addresses[0].city;
  const cityFiltered =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      { body: { city: cityToFilter } satisfies IShoppingMallAddress.IRequest },
    );
  typia.assert(cityFiltered);
  TestValidator.predicate(
    "city filter exact match",
    cityFiltered.data.every((addr) => addr.city === cityToFilter),
  );
  // 5. Test is_default filter
  const defaultAddress =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      { body: { is_default: true } satisfies IShoppingMallAddress.IRequest },
    );
  typia.assert(defaultAddress);
  TestValidator.equals("default address count", defaultAddress.data.length, 1);
  TestValidator.predicate(
    "default address is_default is true",
    defaultAddress.data[0].is_default === true,
  );
  const nonDefaultAddresses =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      { body: { is_default: false } satisfies IShoppingMallAddress.IRequest },
    );
  typia.assert(nonDefaultAddresses);
  TestValidator.equals(
    "non-default address count",
    nonDefaultAddresses.data.length,
    9,
  );
  TestValidator.predicate(
    "non-default addresses is_default is false",
    nonDefaultAddresses.data.every((addr) => addr.is_default === false),
  );
  // 6. Test search keyword (partial match)
  const searchKeyword = "Recipient";
  const searchResults =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: { search: searchKeyword } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search returns matching addresses",
    searchResults.data.length > 0,
  );
  // 7. Test combined filters (country + city)
  const combinedFilter =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          country: countryToFilter,
          city: cityToFilter,
        } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter matches both country and city",
    combinedFilter.data.every(
      (addr) => addr.country === countryToFilter && addr.city === cityToFilter,
    ),
  );
  // 8. Test pagination - default limit
  const defaultPagination =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      { body: {} satisfies IShoppingMallAddress.IRequest },
    );
  typia.assert(defaultPagination);
  TestValidator.equals(
    "default limit is 20",
    defaultPagination.pagination.limit,
    20,
  );
  TestValidator.equals(
    "current page is 1",
    defaultPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "records match total",
    defaultPagination.pagination.records,
    addresses.length,
  );
  // 9. Test pagination with custom limit
  const customLimit = 5;
  const customPagination =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      { body: { limit: customLimit } satisfies IShoppingMallAddress.IRequest },
    );
  typia.assert(customPagination);
  TestValidator.equals(
    "custom limit applied",
    customPagination.pagination.limit,
    customLimit,
  );
  TestValidator.equals(
    "data length respects limit",
    customPagination.data.length,
    customLimit,
  );
  // 10. Test pagination page navigation
  const page2 = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: customLimit,
      } satisfies IShoppingMallAddress.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  TestValidator.notEquals(
    "page 2 has different items",
    page2.data[0].id,
    customPagination.data[0].id,
  );
  // 11. Test maximum limit constraint (100)
  const maxLimit = 100;
  const maxLimitPagination =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      { body: { limit: maxLimit } satisfies IShoppingMallAddress.IRequest },
    );
  typia.assert(maxLimitPagination);
  TestValidator.equals(
    "max limit is 100",
    maxLimitPagination.pagination.limit,
    maxLimit,
  );
  // 12. Verify pagination metadata accuracy
  const allAddresses =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      { body: { limit: 100 } satisfies IShoppingMallAddress.IRequest },
    );
  typia.assert(allAddresses);
  TestValidator.equals(
    "pagination records equals total addresses",
    allAddresses.pagination.records,
    addresses.length,
  );
  const expectedPages = Math.ceil(addresses.length / 20);
  TestValidator.equals(
    "pagination pages calculated correctly",
    allAddresses.pagination.pages,
    expectedPages,
  );
}
