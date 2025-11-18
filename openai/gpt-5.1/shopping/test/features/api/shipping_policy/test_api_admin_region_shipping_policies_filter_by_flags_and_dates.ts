import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRegionShippingPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRegionShippingPolicy";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRegionShippingPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionShippingPolicy";

export async function test_api_admin_region_shipping_policies_filter_by_flags_and_dates(
  connection: api.IConnection,
) {
  // 1. Register admin and establish authenticated context
  const adminJoinInput = {
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country
  const countryCode = RandomGenerator.alphabets(6).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: `Country ${countryCode}`,
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 3. Create a region under that country
  const regionCode = RandomGenerator.alphabets(6).toUpperCase();
  const regionCreateBody = {
    code: regionCode,
    name_en: `Region ${regionCode}`,
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

  // Prepare effective date ranges
  const now = new Date();
  const past = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
  const future = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days later

  const pastIso = past.toISOString();
  const futureIso = future.toISOString();

  const farPast = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const farFuture = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later

  const farPastIso = farPast.toISOString();
  const farFutureIso = farFuture.toISOString();

  // 4. Create three shipping policies under that region
  // Policy A: allowed shipping + COD, window around now
  const policyABody = {
    policy_name: "Policy-A",
    shipping_method_group: "STANDARD",
    min_order_amount: 0,
    max_order_amount: null,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: "Policy A - allow shipping and COD within near window",
    effective_from: pastIso,
    effective_until: futureIso,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policyA: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode,
        body: policyABody,
      },
    );
  typia.assert(policyA);

  // Policy B: allowed shipping, but COD not allowed, overlapping window
  const policyBBody = {
    policy_name: "Policy-B",
    shipping_method_group: "STANDARD",
    min_order_amount: 0,
    max_order_amount: null,
    allows_cod: false,
    is_shipping_allowed: true,
    notes: "Policy B - allow shipping but no COD, same dates as A",
    effective_from: pastIso,
    effective_until: futureIso,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policyB: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode,
        body: policyBBody,
      },
    );
  typia.assert(policyB);

  // Policy C: shipping not allowed, different effective window (far past to far future)
  const policyCBody = {
    policy_name: "Policy-C",
    shipping_method_group: "STANDARD",
    min_order_amount: 0,
    max_order_amount: null,
    allows_cod: false,
    is_shipping_allowed: false,
    notes: "Policy C - shipping disabled, far window",
    effective_from: farPastIso,
    effective_until: farFutureIso,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policyC: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode,
        body: policyCBody,
      },
    );
  typia.assert(policyC);

  // 5. First search: flags true/true and date window around now
  const firstSearchRequest = {
    page: 1,
    limit: 10,
    policy_name: null,
    is_shipping_allowed: true,
    allows_cod: true,
    effective_from_from: pastIso,
    effective_from_to: futureIso,
    effective_until_from: null,
    effective_until_to: null,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallRegionShippingPolicy.IRequest;

  const firstPage: IPageIShoppingMallRegionShippingPolicy.ISummary =
    await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.index(
      connection,
      {
        countryCode,
        regionCode,
        body: firstSearchRequest,
      },
    );
  typia.assert(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  // 6. Assertions for first search
  TestValidator.equals(
    "first search - records should be 1",
    firstPagination.records,
    1,
  );
  TestValidator.equals(
    "first search - data length should be 1",
    firstData.length,
    1,
  );
  TestValidator.equals(
    "first search - pages should be 1 when limit >= records",
    firstPagination.pages,
    1,
  );

  const firstPolicy = firstData[0];

  TestValidator.equals(
    "first search - returned policy should be A",
    firstPolicy.id,
    policyA.id,
  );

  TestValidator.equals(
    "first search - returned policy allows_cod should be true",
    firstPolicy.allows_cod,
    true,
  );
  TestValidator.equals(
    "first search - returned policy is_shipping_allowed should be true",
    firstPolicy.is_shipping_allowed,
    true,
  );

  // 7. Second search: select only Policy C (is_shipping_allowed=false & allows_cod=false)
  const secondSearchRequest = {
    page: 1,
    limit: 10,
    policy_name: null,
    is_shipping_allowed: false,
    allows_cod: false,
    effective_from_from: farPastIso,
    effective_from_to: farFutureIso,
    effective_until_from: null,
    effective_until_to: null,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallRegionShippingPolicy.IRequest;

  const secondPage: IPageIShoppingMallRegionShippingPolicy.ISummary =
    await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.index(
      connection,
      {
        countryCode,
        regionCode,
        body: secondSearchRequest,
      },
    );
  typia.assert(secondPage);

  const secondPagination = secondPage.pagination;
  const secondData = secondPage.data;

  // 8. Assertions for second search
  TestValidator.equals(
    "second search - records should be 1",
    secondPagination.records,
    1,
  );
  TestValidator.equals(
    "second search - data length should be 1",
    secondData.length,
    1,
  );
  TestValidator.equals(
    "second search - pages should be 1 when limit >= records",
    secondPagination.pages,
    1,
  );

  const secondPolicy = secondData[0];

  TestValidator.equals(
    "second search - returned policy should be C",
    secondPolicy.id,
    policyC.id,
  );

  TestValidator.equals(
    "second search - returned policy allows_cod should be false",
    secondPolicy.allows_cod,
    false,
  );
  TestValidator.equals(
    "second search - returned policy is_shipping_allowed should be false",
    secondPolicy.is_shipping_allowed,
    false,
  );
}
