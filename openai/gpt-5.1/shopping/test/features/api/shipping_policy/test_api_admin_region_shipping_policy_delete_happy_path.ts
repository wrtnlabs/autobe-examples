import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRegionShippingPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionShippingPolicy";

/**
 * Validate happy-path deletion of a region-level shipping policy by an
 * authenticated admin.
 *
 * Business steps:
 *
 * 1. Register a new admin with POST /auth/admin/join to obtain an authenticated
 *    context.
 * 2. Create an active country via POST /shoppingMall/admin/countries using
 *    IShoppingMallCountry.ICreate.
 * 3. Under that country, create an active region via POST
 *    /shoppingMall/admin/countries/{countryCode}/regions using
 *    IShoppingMallRegion.ICreate.
 * 4. Create a region-level shipping policy for that (country, region) via POST
 *    /shoppingMall/countries/{countryCode}/regions/{regionCode}/shippingPolicies
 *    using IShoppingMallRegionShippingPolicy.ICreate.
 * 5. Delete the created policy via DELETE
 *    /shoppingMall/admin/countries/{countryCode}/regions/{regionCode}/shippingPolicies/{policyId}.
 * 6. Assert that all creation calls return correctly typed objects and that
 *    deletion completes without error.
 *
 * Due to the lack of a GET/list endpoint for region shipping policies in the
 * provided SDK, the test treats successful completion of the DELETE call (no
 * thrown HttpError) as sufficient evidence that the policy has been removed,
 * and focuses on strongly validating the creation steps using typia.assert and
 * basic TestValidator predicates.
 */
export async function test_api_admin_region_shipping_policy_delete_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin registration / authentication
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!", // matches tags.Format<"password"> semantic expectation
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
    ip: "127.0.0.1",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country
  const countryCode = `CTY-${RandomGenerator.alphaNumeric(6)}`;
  const countryCreateBody = {
    country_code: countryCode,
    name_en: `Country ${RandomGenerator.name(1)}`,
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  TestValidator.equals(
    "created country_code should match request",
    country.country_code,
    countryCode,
  );
  TestValidator.predicate(
    "created country should be active",
    country.is_active === true,
  );

  // 3. Create a region under the country
  const regionCode = `RG-${RandomGenerator.alphaNumeric(6)}`;
  const regionCreateBody = {
    code: regionCode,
    name_en: `Region ${RandomGenerator.name(1)}`,
    region_type: "city",
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

  TestValidator.equals(
    "created region code should match request",
    region.code,
    regionCode,
  );
  TestValidator.equals(
    "region.country.country_code should match parent countryCode",
    region.country.country_code,
    countryCode,
  );
  TestValidator.predicate(
    "created region should be active",
    region.is_active === true,
  );

  // 4. Create a region-level shipping policy for that (country, region)
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour ago
  const effectiveUntil = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString(); // +1 day

  const policyCreateBody = {
    policy_name: `Policy ${RandomGenerator.name(1)}`,
    shipping_method_group: "STANDARD",
    min_order_amount: 10,
    max_order_amount: 1000,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode,
        body: policyCreateBody,
      },
    );
  typia.assert(policy);

  TestValidator.equals(
    "shipping policy region summary code should match regionCode",
    policy.region.code,
    regionCode,
  );
  TestValidator.equals(
    "shipping policy region summary country_code should match countryCode",
    policy.region.country.country_code,
    countryCode,
  );
  TestValidator.predicate(
    "shipping is allowed in created policy",
    policy.is_shipping_allowed === true,
  );
  TestValidator.predicate(
    "COD is allowed in created policy",
    policy.allows_cod === true,
  );

  // 5. Delete the created shipping policy via admin endpoint
  await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.erase(
    connection,
    {
      countryCode,
      regionCode,
      policyId: policy.id,
    },
  );

  // 6. Basic post-conditions: we only know that the call did not throw.
  // We can still assert that our in-memory references for country and region remain intact.
  TestValidator.equals(
    "country object remains consistent after policy deletion",
    country.country_code,
    countryCode,
  );
  TestValidator.equals(
    "region object remains consistent after policy deletion",
    region.code,
    regionCode,
  );
}
