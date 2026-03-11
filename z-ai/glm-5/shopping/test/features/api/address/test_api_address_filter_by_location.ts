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

/**
 * Test that a customer can filter their addresses by location fields
 * (city, state/province, country) and default status with proper
 * case-insensitive partial matching.
 *
 * Setup: Customer creates addresses in different cities and countries,
 * with one set as default.
 *
 * Test Steps:
 * 1. Authenticate as a customer
 * 2. Create addresses in different locations (New York, Los Angeles, Seoul)
 * 3. Set one address as default
 * 4. Filter addresses by city using partial text match
 * 5. Filter addresses by isDefault = true to get only default address
 * 6. Filter addresses by isDefault = false
 * 7. Filter addresses by country
 * 8. Combine multiple filters (city AND country)
 */
export async function test_api_address_filter_by_location(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create addresses in different locations
  // New York address
  const newYorkAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: "123 Broadway Ave",
          city: "New York",
          stateProvince: "New York",
          postalCode: "10001",
          country: "United States",
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(newYorkAddress);
  // Los Angeles address
  const losAngelesAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: "456 Hollywood Blvd",
          city: "Los Angeles",
          stateProvince: "California",
          postalCode: "90001",
          country: "United States",
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(losAngelesAddress);
  // Seoul address (different country)
  const seoulAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: "789 Gangnam-ro",
          city: "Seoul",
          stateProvince: "Seoul",
          postalCode: "06000",
          country: "South Korea",
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(seoulAddress);
  // 3. Verify first address is default (first created becomes default)
  TestValidator.predicate(
    "first address should be default",
    newYorkAddress.isDefault === true,
  );
  TestValidator.predicate(
    "other addresses should not be default",
    losAngelesAddress.isDefault === false && seoulAddress.isDefault === false,
  );
  // 4. Filter by city using partial text match (case-insensitive)
  // Test partial match: "York" should match "New York"
  const cityFilterResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: { city: "York" } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(cityFilterResult);
  TestValidator.predicate(
    "city filter 'York' should return New York address",
    cityFilterResult.data.length === 1 &&
      cityFilterResult.data[0].id === newYorkAddress.id,
  );
  // Test case-insensitive: "new york" should match "New York"
  const caseInsensitiveResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: { city: "new york" } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(caseInsensitiveResult);
  TestValidator.predicate(
    "case-insensitive city filter should work",
    caseInsensitiveResult.data.length === 1 &&
      caseInsensitiveResult.data[0].id === newYorkAddress.id,
  );
  // 5. Filter by isDefault = true to get only default address
  const defaultFilterResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: { isDefault: true } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(defaultFilterResult);
  TestValidator.predicate(
    "isDefault=true should return only default address",
    defaultFilterResult.data.length === 1 &&
      defaultFilterResult.data[0].is_default === true,
  );
  // 6. Filter by isDefault = false to get non-default addresses
  const nonDefaultFilterResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: { isDefault: false } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(nonDefaultFilterResult);
  TestValidator.predicate(
    "isDefault=false should return non-default addresses",
    nonDefaultFilterResult.data.length === 2 &&
      nonDefaultFilterResult.data.every((addr) => addr.is_default === false),
  );
  // 7. Filter by country
  const countryFilterResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          country: "United States",
        } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(countryFilterResult);
  TestValidator.predicate(
    "country filter should return US addresses",
    countryFilterResult.data.length === 2 &&
      countryFilterResult.data.every((addr) =>
        addr.country.toLowerCase().includes("united states".toLowerCase()),
      ),
  );
  // Test partial country match: "Korea" should match "South Korea"
  const koreaFilterResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: { country: "Korea" } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(koreaFilterResult);
  TestValidator.predicate(
    "partial country filter 'Korea' should return Seoul address",
    koreaFilterResult.data.length === 1 &&
      koreaFilterResult.data[0].id === seoulAddress.id,
  );
  // 8. Combine filters: city AND country
  const combinedFilterResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          city: "Angeles",
          country: "United States",
        } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter should return Los Angeles address",
    combinedFilterResult.data.length === 1 &&
      combinedFilterResult.data[0].id === losAngelesAddress.id,
  );
  // 9. Test state/province filter
  const stateFilterResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: { stateProvince: "Cali" } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(stateFilterResult);
  TestValidator.predicate(
    "partial state filter 'Cali' should return California address",
    stateFilterResult.data.length === 1 &&
      stateFilterResult.data[0].id === losAngelesAddress.id,
  );
  // 10. Test empty filter returns all addresses
  const allAddressesResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(allAddressesResult);
  TestValidator.predicate(
    "empty filter should return all addresses",
    allAddressesResult.data.length === 3,
  );
}
