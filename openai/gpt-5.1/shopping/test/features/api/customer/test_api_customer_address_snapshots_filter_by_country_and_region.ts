import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

/**
 * Validate geographic filtering of customer address snapshots by countryId and
 * regionId.
 *
 * Business context: Support and audit tools need to inspect historical address
 * usage for a specific customer, scoped by geography. The PATCH
 * /shoppingMall/customer/customers/{customerId}/addressSnapshots endpoint
 * accepts search criteria including countryId and regionId and returns a
 * paginated list of immutable address snapshots. Although the snapshot summary
 * DTO does not expose raw country/region identifiers, the request contract must
 * be stable and type-safe when those filters are provided.
 *
 * This test sets up realistic master data (countries and regions) and a
 * customer with several addresses referencing different country/region
 * combinations. It then issues snapshot search requests filtered by
 * countryId-only and by countryId+regionId to ensure
 * IShoppingMallCustomerAddressSnapshot.IRequest behaves correctly and that the
 * API returns a well-typed paginated response.
 *
 * Steps:
 *
 * 1. Register and log in an admin actor to gain access to country/region admin
 *    APIs.
 * 2. Create two active countries (countryA and countryB).
 * 3. Under countryA, create one active region (regionA1).
 * 4. Register and log in a customer actor and capture its customerId.
 * 5. As the customer, create multiple addresses under different geographic
 *    combinations:
 *
 *    - AddressA1: countryA + regionA1
 *    - AddressA2: countryA + no region
 *    - AddressB1: countryB + no region
 * 6. Call PATCH /shoppingMall/customer/customers/{customerId}/addressSnapshots
 *    with countryId set to countryA.id, regionId left null, and reasonable
 *    pagination/sort values. Assert that the response matches
 *    IPageIShoppingMallCustomerAddressSnapshot.ISummary via typia.assert.
 * 7. Call the same endpoint with both countryId=countryA.id and
 *    regionId=regionA1.id and assert the response type again.
 * 8. Optionally, call with countryId=countryB.id and regionId=null to ensure the
 *    endpoint accepts filters for another country and returns a valid page.
 */
export async function test_api_customer_address_snapshots_filter_by_country_and_region(
  connection: api.IConnection,
) {
  // 1. Admin registration (join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminJoinOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 2. Admin login to ensure token handling is stable
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoginOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  // 3. Create two countries
  const countryABody = {
    country_code: RandomGenerator.alphaNumeric(3).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    phone_code: "+" + typia.random<number & tags.Type<"uint32">>().toString(),
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const countryA: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryABody,
    });
  typia.assert(countryA);

  const countryBBody = {
    country_code: RandomGenerator.alphaNumeric(3).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    phone_code: null,
    is_active: true,
    sort_order: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const countryB: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBBody,
    });
  typia.assert(countryB);

  // 4. Create one region under countryA
  const regionABody = {
    code: RandomGenerator.alphaNumeric(4).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const regionA: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryA.country_code,
        body: regionABody,
      },
    );
  typia.assert(regionA);

  // 5. Customer join
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerJoinOutput: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoinOutput);
  const customerId: string & tags.Format<"uuid"> = customerJoinOutput.id;

  // 6. Customer login to ensure subsequent calls use customer context
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoginOutput: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginOutput);

  // 7. Create customer addresses with different country/region combinations
  const addressABody1 = {
    shopping_mall_country_id: countryA.id,
    shopping_mall_region_id: regionA.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 1 }),
    line2: null,
    city: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphabets(5),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const addressA1: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressABody1,
      },
    );
  typia.assert(addressA1);

  const addressABody2 = {
    shopping_mall_country_id: countryA.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 1 }),
    line2: null,
    city: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphabets(5),
    phone_number: RandomGenerator.mobile(),
    is_default: false,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const addressA2: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressABody2,
      },
    );
  typia.assert(addressA2);

  const addressBBody1 = {
    shopping_mall_country_id: countryB.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 1 }),
    line2: null,
    city: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphabets(5),
    phone_number: RandomGenerator.mobile(),
    is_default: false,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const addressB1: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressBBody1,
      },
    );
  typia.assert(addressB1);

  // 8. Call snapshot index filtered by countryA only
  const requestCountryOnly = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    orderByCreatedAt: "desc",
    createdAtFrom: null,
    createdAtTo: null,
    countryId: countryA.id,
    regionId: null,
    searchText: null,
  } satisfies IShoppingMallCustomerAddressSnapshot.IRequest;
  const snapshotsCountryOnly: IPageIShoppingMallCustomerAddressSnapshot.ISummary =
    await api.functional.shoppingMall.customer.customers.addressSnapshots.index(
      connection,
      {
        customerId,
        body: requestCountryOnly,
      },
    );
  typia.assert(snapshotsCountryOnly);
  TestValidator.predicate(
    "snapshot listing with country filter returns a valid page",
    snapshotsCountryOnly.pagination.limit >= 0,
  );

  // 9. Call snapshot index filtered by countryA and regionA
  const requestCountryRegion = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    orderByCreatedAt: "desc",
    createdAtFrom: null,
    createdAtTo: null,
    countryId: countryA.id,
    regionId: regionA.id,
    searchText: null,
  } satisfies IShoppingMallCustomerAddressSnapshot.IRequest;
  const snapshotsCountryRegion: IPageIShoppingMallCustomerAddressSnapshot.ISummary =
    await api.functional.shoppingMall.customer.customers.addressSnapshots.index(
      connection,
      {
        customerId,
        body: requestCountryRegion,
      },
    );
  typia.assert(snapshotsCountryRegion);
  TestValidator.predicate(
    "snapshot listing with country and region filter returns a valid page",
    snapshotsCountryRegion.pagination.limit >= 0,
  );

  // 10. Call snapshot index filtered by countryB only (optional coverage)
  const requestCountryBOnly = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    orderByCreatedAt: "desc",
    createdAtFrom: null,
    createdAtTo: null,
    countryId: countryB.id,
    regionId: null,
    searchText: null,
  } satisfies IShoppingMallCustomerAddressSnapshot.IRequest;
  const snapshotsCountryBOnly: IPageIShoppingMallCustomerAddressSnapshot.ISummary =
    await api.functional.shoppingMall.customer.customers.addressSnapshots.index(
      connection,
      {
        customerId,
        body: requestCountryBOnly,
      },
    );
  typia.assert(snapshotsCountryBOnly);
  TestValidator.predicate(
    "snapshot listing with another country filter returns a valid page",
    snapshotsCountryBOnly.pagination.limit >= 0,
  );
}
