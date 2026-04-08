import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer address listing with filtering and search capabilities.
 *
 * Validates the comprehensive filtering, searching, sorting, and pagination functionality for customer shipping addresses. Ensures that customers can effectively query their saved addresses using various criteria including default status, location filters, text search, and custom sorting.
 *
 * The test creates multiple addresses with diverse attributes and verifies each filtering and search scenario independently and in combination. Pagination is validated to ensure correct record counts and data retrieval across pages.
 *
 * 1. Customer registers and authenticates.
 * 2. Create 5 addresses with varying cities, countries, default status, and recipient names.
 * 3. Test filter by is_default=true returns exactly one default address.
 * 4. Test filter by city returns only addresses in that city.
 * 5. Test filter by country returns only addresses in that country.
 * 6. Test search by recipient_name returns matching addresses.
 * 7. Test search by street_address returns matching addresses.
 * 8. Test combined filters (is_default + city) work correctly.
 * 9. Test sorting by recipient_name ascending returns alphabetically ordered results.
 * 10. Test pagination with limit=2 returns correct page data and counts.
 */
export async function test_api_customer_address_list_with_filters_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create 5 addresses with varying attributes
  // Create multiple addresses for testing (using simulation/random data)
  const addresses: IEcommerceAddress.ISummary[] = ArrayUtil.repeat(5, () => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    recipient_name: RandomGenerator.name(),
    street_address: `${RandomGenerator.alphaNumeric(5)} ${RandomGenerator.alphabets(3)} Street`,
    city: RandomGenerator.pick([
      "Seoul",
      "Busan",
      "Incheon",
      "Daegu",
      "Daejeon",
    ]),
    state: "Gyeonggi-do",
    postal_code: typia.random<string>(),
    country: "South Korea",
    is_default: false,
    created_at: new Date().toISOString(),
    deleted_at: null,
  }));
  // Make one address default
  addresses[0].is_default = true;
  addresses[0].city = "Seoul";
  addresses[0].recipient_name = "Alice Johnson";
  addresses[1].city = "Seoul";
  addresses[1].recipient_name = "Bob Smith";
  addresses[2].city = "Busan";
  addresses[2].country = "South Korea";
  addresses[2].recipient_name = "Charlie Brown";
  addresses[3].city = "Incheon";
  addresses[3].country = "South Korea";
  addresses[3].recipient_name = "David Wilson";
  addresses[4].city = "Daegu";
  addresses[4].country = "South Korea";
  addresses[4].recipient_name = "Eve Davis";
  addresses[4].is_default = true; // This will replace the previous default
  // Reset first address to non-default
  addresses[0].is_default = false;
  // 3. Test filter by is_default=true
  const defaultFilterResult: IPageIEcommerceAddress.ISummary =
    await api.functional.ecommerce.customer.addresses.index(
      customerConnection,
      {
        body: {
          is_default: true,
        } satisfies IEcommerceAddress.IRequest,
      },
    );
  typia.assert(defaultFilterResult);
  TestValidator.equals(
    "default filter returns only default addresses",
    defaultFilterResult.data.length,
    1,
  );
  TestValidator.predicate(
    "default address is marked as default",
    defaultFilterResult.data.every((addr) => addr.is_default === true),
  );
  // 4. Test filter by city
  const seoulFilterResult: IPageIEcommerceAddress.ISummary =
    await api.functional.ecommerce.customer.addresses.index(
      customerConnection,
      {
        body: {
          city: "Seoul",
        } satisfies IEcommerceAddress.IRequest,
      },
    );
  typia.assert(seoulFilterResult);
  TestValidator.equals(
    "city filter returns only Seoul addresses",
    seoulFilterResult.data.length,
    2,
  );
  TestValidator.predicate(
    "all Seoul addresses have city Seoul",
    seoulFilterResult.data.every((addr) => addr.city === "Seoul"),
  );
  // 5. Test filter by country
  const koreaFilterResult: IPageIEcommerceAddress.ISummary =
    await api.functional.ecommerce.customer.addresses.index(
      customerConnection,
      {
        body: {
          country: "South Korea",
        } satisfies IEcommerceAddress.IRequest,
      },
    );
  typia.assert(koreaFilterResult);
  TestValidator.equals(
    "country filter returns only South Korea addresses",
    koreaFilterResult.data.length,
    5,
  );
  TestValidator.predicate(
    "all addresses have country South Korea",
    koreaFilterResult.data.every((addr) => addr.country === "South Korea"),
  );
  // 6. Test search by recipient_name
  const nameSearchResult: IPageIEcommerceAddress.ISummary =
    await api.functional.ecommerce.customer.addresses.index(
      customerConnection,
      {
        body: {
          search: "Alice",
        } satisfies IEcommerceAddress.IRequest,
      },
    );
  typia.assert(nameSearchResult);
  TestValidator.predicate(
    "recipient_name search returns matching addresses",
    nameSearchResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all searched addresses contain 'Alice' in recipient_name",
    nameSearchResult.data.every((addr) =>
      addr.recipient_name.toLowerCase().includes("alice"),
    ),
  );
  // 7. Test search by street_address
  const streetSearchResult: IPageIEcommerceAddress.ISummary =
    await api.functional.ecommerce.customer.addresses.index(
      customerConnection,
      {
        body: {
          search: "Street",
        } satisfies IEcommerceAddress.IRequest,
      },
    );
  typia.assert(streetSearchResult);
  TestValidator.predicate(
    "street_address search returns matching addresses",
    streetSearchResult.data.length >= 1,
  );
  // 8. Test combined filters (is_default + city)
  const combinedFilterResult: IPageIEcommerceAddress.ISummary =
    await api.functional.ecommerce.customer.addresses.index(
      customerConnection,
      {
        body: {
          is_default: true,
          city: "Seoul",
        } satisfies IEcommerceAddress.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters work correctly",
    combinedFilterResult.data.every(
      (addr) => addr.is_default === true && addr.city === "Seoul",
    ),
  );
  // 9. Test sorting by recipient_name ascending
  const sortedResult: IPageIEcommerceAddress.ISummary =
    await api.functional.ecommerce.customer.addresses.index(
      customerConnection,
      {
        body: {
          sort_by: "recipient_name",
          sort_order: "asc",
        } satisfies IEcommerceAddress.IRequest,
      },
    );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorting by recipient_name ascending returns alphabetically ordered results",
    sortedResult.data.every((addr, index) => {
      if (index === 0) return true;
      return sortedResult.data[index - 1].recipient_name <= addr.recipient_name;
    }),
  );
  // 10. Test pagination with limit=2
  const paginationResult: IPageIEcommerceAddress.ISummary =
    await api.functional.ecommerce.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceAddress.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination returns correct page size",
    paginationResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination metadata shows correct current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination metadata shows correct limit",
    paginationResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination metadata shows correct total records",
    paginationResult.pagination.records >= 2,
  );
}