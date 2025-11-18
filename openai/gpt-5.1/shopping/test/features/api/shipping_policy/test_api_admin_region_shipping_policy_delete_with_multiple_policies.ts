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
 * Validate deleting one of multiple region shipping policies.
 *
 * Business goal: Ensure that when an admin deletes a single region-level
 * shipping policy, only that policy is affected and other policies for the same
 * region remain fully manageable. Also verify that re-deleting the same policy
 * fails, proving proper idempotent 404-style behavior for already-removed
 * resources.
 *
 * Scenario steps:
 *
 * 1. Admin join to obtain authenticated admin context.
 * 2. Create a country via admin API with a concrete business country_code.
 * 3. Create a region inside that country using the admin regions create API.
 * 4. Create two distinct region shipping policies on the same country/region using
 *    the public shippingPolicies.create API, with different policy_name values
 *    and slightly varied configuration fields.
 * 5. Delete the first policy via the admin erase endpoint.
 * 6. Attempt to delete the same policy again and assert that an error is thrown
 *    (runtime business error), proving the record is gone.
 * 7. Delete the second policy successfully to validate that other policies are
 *    unaffected by the first deletion.
 *
 * Constraints and notes:
 *
 * - There is no list/read endpoint for policies in the provided SDK, so we
 *   validate behavior indirectly by:
 *
 *   - Trusting creation responses via typia.assert,
 *   - Confirming first delete does not throw,
 *   - Confirming re-delete throws,
 *   - Confirming independent deletion of the second policy still works.
 * - The test must not attempt any type-error based validation, must use correct
 *   DTO shapes with satisfies, and must await all API calls.
 */
export async function test_api_admin_region_shipping_policy_delete_with_multiple_policies(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated admin context.
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a country via admin API.
  const countryCode = RandomGenerator.alphaNumeric(3).toUpperCase();
  const countryBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);
  TestValidator.equals(
    "created country_code matches request",
    country.country_code,
    countryCode,
  );

  // 3. Create a region inside that country.
  const regionCode = RandomGenerator.alphaNumeric(5).toUpperCase();
  const regionBody = {
    code: regionCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: "city",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryCode,
        body: regionBody,
      },
    );
  typia.assert(region);
  TestValidator.equals(
    "created region code matches request",
    region.code,
    regionCode,
  );
  TestValidator.equals(
    "region belongs to created country",
    region.country.country_code,
    countryCode,
  );

  // 4. Create two distinct region shipping policies for the same region.
  const policyBody1 = {
    policy_name: `POLICY_${RandomGenerator.alphaNumeric(6)}`,
    shipping_method_group: "STANDARD",
    min_order_amount: 0,
    max_order_amount: 100000,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policy1: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode: countryCode,
        regionCode: regionCode,
        body: policyBody1,
      },
    );
  typia.assert(policy1);
  TestValidator.equals(
    "first policy_name matches request",
    policy1.policy_name,
    policyBody1.policy_name,
  );

  const policyBody2 = {
    policy_name: `POLICY_${RandomGenerator.alphaNumeric(6)}`,
    shipping_method_group: "EXPRESS",
    min_order_amount: 5000,
    max_order_amount: 200000,
    allows_cod: false,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policy2: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode: countryCode,
        regionCode: regionCode,
        body: policyBody2,
      },
    );
  typia.assert(policy2);
  TestValidator.notEquals(
    "second policy has different id from first",
    policy2.id,
    policy1.id,
  );
  TestValidator.notEquals(
    "second policy has different policy_name from first",
    policy2.policy_name,
    policy1.policy_name,
  );

  // 5. Delete the first policy via admin erase endpoint.
  await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.erase(
    connection,
    {
      countryCode: countryCode,
      regionCode: regionCode,
      policyId: policy1.id,
    },
  );

  // 6. Attempt to delete the same policy again and assert an error occurs.
  await TestValidator.error(
    "re-deleting the same policy should fail",
    async () => {
      await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.erase(
        connection,
        {
          countryCode: countryCode,
          regionCode: regionCode,
          policyId: policy1.id,
        },
      );
    },
  );

  // 7. Delete the second policy successfully, confirming independence.
  await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.erase(
    connection,
    {
      countryCode: countryCode,
      regionCode: regionCode,
      policyId: policy2.id,
    },
  );
}
