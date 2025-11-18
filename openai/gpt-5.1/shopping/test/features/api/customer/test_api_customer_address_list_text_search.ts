import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

/**
 * Validate free-text search (q) behavior on customer address listing.
 *
 * Business goal
 *
 * - A logged-in customer should be able to search their own saved shipping
 *   addresses using a free-text query `q` applied to human-readable address
 *   components such as `recipient_name`, `line1`, `line2`, `city`, and
 *   `postal_code`.
 *
 * Scenario overview
 *
 * 1. Create an administrator account and log in as admin.
 * 2. Admin creates a single active country and a region under that country.
 * 3. Create a customer account (join) and implicitly log in as that customer.
 * 4. Under that customer, create several addresses with clearly distinct textual
 *    patterns so search results are predictable.
 * 5. Perform a text search with a keyword that only appears in exactly one address
 *    and verify that only that address appears in the result data.
 * 6. Perform another text search with a keyword that appears in multiple addresses
 *    and verify that all and only the matching addresses are returned, with
 *    pagination metadata consistent with counts.
 *
 * Implementation notes
 *
 * - Use only the provided DTOs and API functions.
 * - Rely on type-safe request bodies with `satisfies` and avoid any `as`-based
 *   assertions on DTO fields.
 * - Always call `typia.assert` on non-void API responses for structural
 *   validation, and `TestValidator` for business-logic checks (counts,
 *   membership, absence of non-matching records).
 * - Do not touch `connection.headers` directly; authentication is handled by the
 *   SDK `join`/`login` functions.
 */
export async function test_api_customer_address_list_text_search(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication is established by SDK)
  const adminJoinInput = {
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "Admin!234",
    ip: null,
    href: "https://admin.shopping-mall.test/join",
    referrer: "https://admin.shopping-mall.test",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates a country
  const countryCode = `CTY-${RandomGenerator.alphaNumeric(4)}`;

  const countryCreateBody = {
    country_code: countryCode,
    name_en: "Testland",
    phone_code: "+999",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 2-1. Admin creates a region under the country
  const regionCreateBody = {
    code: "TL-1",
    name_en: "Testland Region One",
    region_type: "state",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 3. Customer join (implicit login via join)
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test`,
    password: "Customer!234",
    ip: null,
    href: "https://shop.test/join",
    referrer: "https://shop.test",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId = customerAuthorized.id;

  // 4. Customer creates multiple addresses with distinct patterns.
  // Address A: contains keyword "WarehouseUnique" in line1 only
  const addressABody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Alice Receiver",
    line1: "Alice WarehouseUnique Street 1",
    line2: "Building A",
    city: "Alpha City",
    postal_code: "11111",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressA: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressABody,
      },
    );
  typia.assert(addressA);

  // Address B: does NOT contain keyword "WarehouseUnique", but does contain
  // shared keyword "HomeShared".
  const addressBBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Bob HomeShared",
    line1: "Bob HomeShared Street 2",
    line2: null,
    city: "Beta Town",
    postal_code: "22222",
    phone_number: RandomGenerator.mobile(),
    is_default: false,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressB: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressBBody,
      },
    );
  typia.assert(addressB);

  // Address C: also contains the shared keyword "HomeShared" but not
  // "WarehouseUnique".
  const addressCBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Charlie HomeShared",
    line1: "Charlie HomeShared Avenue 3",
    line2: "Suite 300",
    city: "Gamma Ville",
    postal_code: "33333",
    phone_number: RandomGenerator.mobile(),
    is_default: false,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressC: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressCBody,
      },
    );
  typia.assert(addressC);

  // 5. Single-hit search using keyword only in Address A
  const singleKeyword = "WarehouseUnique";

  const singleSearchRequest = {
    page: 1,
    pageSize: 10,
    sortKey: "created_at",
    sortDirection: "desc",
    countryId: country.id,
    regionId: region.id,
    q: singleKeyword,
  } satisfies IShoppingMallCustomerAddress.IRequest;

  const singlePage: IPageIShoppingMallCustomerAddress.ISummary =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: singleSearchRequest,
      },
    );
  typia.assert(singlePage);

  const singlePagination: IPage.IPagination = singlePage.pagination;
  typia.assert(singlePagination);

  // Expect exactly one match
  TestValidator.equals(
    "single-hit search: records count should be 1",
    singlePagination.records,
    1,
  );
  TestValidator.equals(
    "single-hit search: data length should be 1",
    singlePage.data.length,
    1,
  );

  const singleResult = singlePage.data[0];
  TestValidator.equals(
    "single-hit search: returned address id should be A",
    singleResult.id,
    addressA.id,
  );

  // 6. Multi-hit search using shared keyword that appears in B and C only
  const multiKeyword = "HomeShared";

  const multiSearchRequest = {
    page: 1,
    pageSize: 10,
    sortKey: "created_at",
    sortDirection: "desc",
    countryId: country.id,
    regionId: region.id,
    q: multiKeyword,
  } satisfies IShoppingMallCustomerAddress.IRequest;

  const multiPage: IPageIShoppingMallCustomerAddress.ISummary =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: multiSearchRequest,
      },
    );
  typia.assert(multiPage);

  const multiPagination: IPage.IPagination = multiPage.pagination;
  typia.assert(multiPagination);

  TestValidator.equals(
    "multi-hit search: total records should be 2",
    multiPagination.records,
    2,
  );
  TestValidator.equals(
    "multi-hit search: data length should be 2",
    multiPage.data.length,
    2,
  );

  const multiIds = multiPage.data.map((addr) => addr.id);

  TestValidator.predicate(
    "multi-hit search: should contain address B",
    multiIds.includes(addressB.id),
  );
  TestValidator.predicate(
    "multi-hit search: should contain address C",
    multiIds.includes(addressC.id),
  );
  TestValidator.predicate(
    "multi-hit search: should NOT contain address A",
    !multiIds.includes(addressA.id),
  );
}
