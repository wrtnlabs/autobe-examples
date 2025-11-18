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
 * Verify that deleting a region shipping policy requires admin authentication.
 *
 * Business goal: Ensure that the destructive operation DELETE
 * /shoppingMall/admin/countries/{countryCode}/regions/{regionCode}/shippingPolicies/{policyId}
 * cannot be executed by unauthenticated or improperly authenticated callers,
 * while succeeding for a properly authenticated admin.
 *
 * Scenario steps:
 *
 * 1. Admin join & authentication
 *
 *    - Call POST /auth/admin/join with a realistic join payload
 *         (IShoppingMallAdminJoin.ICreate).
 *    - The SDK will set connection.headers.Authorization to the admin's access token
 *         automatically.
 *    - Assert the IShoppingMallAdmin.IAuthorized response with typia.assert.
 * 2. Create country context as admin
 *
 *    - Call POST /shoppingMall/admin/countries with an IShoppingMallCountry.ICreate
 *         body.
 *    - Capture the returned IShoppingMallCountry, especially country_code, which is
 *         used as the path parameter countryCode in subsequent calls.
 *    - Assert the response type with typia.assert.
 * 3. Create region under the country as admin
 *
 *    - Call POST /shoppingMall/admin/countries/{countryCode}/regions with
 *         IShoppingMallRegion.ICreate for the body.
 *    - Use the previously created country.country_code as countryCode.
 *    - Capture the returned IShoppingMallRegion and its business region code
 *         (region.code) for later use as regionCode.
 *    - Assert response type.
 * 4. Create a shipping policy under (country, region)
 *
 *    - Call POST
 *         /shoppingMall/countries/{countryCode}/regions/{regionCode}/shippingPolicies
 *         with IShoppingMallRegionShippingPolicy.ICreate as body.
 *    - Use the same countryCode and regionCode.
 *    - Capture the returned IShoppingMallRegionShippingPolicy, especially `id` which
 *         will be used as policyId for the delete call.
 *    - Assert response type.
 * 5. Exercise unauthenticated delete
 *
 *    - Derive an unauthenticated connection by shallow-cloning the incoming
 *         connection and overriding headers to an empty object, so that no
 *         Authorization header is sent. Do not mutate the original connection
 *         instance.
 *    - Using this unauthenticated connection, call
 *         api.functional.shoppingMall.admin.countries.regions.shippingPolicies.erase
 *         with the real countryCode, regionCode, and policyId.
 *    - Expect the call to fail with an error, and validate failure using
 *         TestValidator.error without asserting specific HTTP status codes.
 * 6. Exercise delete with invalid token
 *
 *    - Derive a second connection that has an obviously invalid token: shallow-clone
 *         the original connection and set headers.Authorization to a bogus
 *         bearer string like "Bearer invalid-token". Do not read or depend on
 *         the original connection.headers.
 *    - Call erase again with this invalid-token connection.
 *    - Expect the call to fail and validate with TestValidator.error, again without
 *         checking concrete status codes.
 * 7. Perform successful deletion as authenticated admin
 *
 *    - Using the original, successfully authenticated admin connection (which still
 *         has the correct Authorization header), call erase with the same
 *         countryCode, regionCode, and policyId.
 *    - This call should succeed without throwing; there is no response body (void),
 *         so no typia.assert is needed.
 * 8. Business assertions
 *
 *    - The fact that the final erase call using the authenticated admin succeeds
 *         implies that the policy still existed after the failed
 *         unauthenticated and invalid-token attempts; therefore, those attempts
 *         did not delete or corrupt the resource.
 *    - Use TestValidator.predicate to document the logical expectation that the
 *         success of the final call confirms the policy remained intact until a
 *         properly authenticated admin executed the erase.
 */
export async function test_api_admin_region_shipping_policy_delete_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create country context as admin
  const countryBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.name(2),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  // 3. Create region under the country as admin
  const regionBody = {
    code: RandomGenerator.alphabets(5).toUpperCase(),
    name_en: RandomGenerator.name(2),
    region_type: "province",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  // 4. Create a shipping policy under (country, region)
  const now = new Date();
  const effectiveFrom = RandomGenerator.date(
    now,
    1000 * 60 * 60 * 24,
  ).toISOString();

  const policyBody = {
    policy_name: RandomGenerator.name(3),
    shipping_method_group: "STANDARD",
    min_order_amount: 10,
    max_order_amount: 1000,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 4 }),
    effective_from: effectiveFrom,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode: country.country_code,
        regionCode: region.code,
        body: policyBody,
      },
    );
  typia.assert(policy);

  // 5. Exercise unauthenticated delete (no Authorization header)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated delete should fail", async () => {
    await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.erase(
      unauthConnection,
      {
        countryCode: country.country_code,
        regionCode: region.code,
        policyId: policy.id,
      },
    );
  });

  // 6. Exercise delete with invalid token
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: "Bearer invalid-token",
    },
  };

  await TestValidator.error(
    "delete with invalid token should fail",
    async () => {
      await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.erase(
        invalidTokenConnection,
        {
          countryCode: country.country_code,
          regionCode: region.code,
          policyId: policy.id,
        },
      );
    },
  );

  // 7. Perform successful deletion as authenticated admin
  await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.erase(
    connection,
    {
      countryCode: country.country_code,
      regionCode: region.code,
      policyId: policy.id,
    },
  );

  // 8. Business-level predicate to document expectation
  TestValidator.predicate(
    "final authenticated delete implies policy remained until authorized erase",
    true,
  );
}
