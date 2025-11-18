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
 * Verify that a region-level shipping policy can be created which completely
 * blocks shipping and disables COD, and that this configuration is persisted
 * correctly.
 *
 * Business context:
 *
 * - Shipping configuration is managed per region under a country.
 * - Some regions may be entirely blocked for operational, legal, or risk reasons;
 *   in such cases, shipping must be disallowed and COD explicitly turned off.
 *
 * This test walks through the minimal admin workflow to configure such a
 * blocked region policy and validates that the resulting policy reflects the
 * requested constraints.
 *
 * High-level steps:
 *
 * 1. Register an admin account via POST /auth/admin/join, which also establishes
 *    the admin authentication context used for subsequent calls.
 * 2. As this admin, create a country via POST /shoppingMall/admin/countries.
 * 3. Under that country, create a region via POST
 *    /shoppingMall/admin/countries/{countryCode}/regions.
 * 4. For that region, create a shipping policy via POST
 *    /shoppingMall/countries/{countryCode}/regions/{regionCode}/shippingPolicies
 *    with the following characteristics:
 *
 *    - Policy_name: unique identifier (e.g., random token) for the region.
 *    - Is_shipping_allowed: false (shipping completely blocked).
 *    - Allows_cod: false (COD disabled).
 *    - Min_order_amount: null.
 *    - Max_order_amount: null.
 *    - Effective_from: null.
 *    - Effective_until: null.
 *    - Notes: explanatory text indicating this is a blocked region.
 * 5. Assert that the response DTO:
 *
 *    - Has is_shipping_allowed === false and allows_cod === false.
 *    - Persists null for min_order_amount, max_order_amount, effective_from, and
 *         effective_until.
 *    - Echoes the configured policy_name and notes.
 *    - Is associated with the expected region and country via the nested region
 *         summary.
 */
export async function test_api_region_shipping_policy_creation_with_shipping_block_and_cod_disabled(
  connection: api.IConnection,
) {
  // 1. Register an admin account (this also sets Authorization header on the connection)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country
  const countryCreateBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+" + RandomGenerator.alphaNumeric(3),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 3. Create a region under that country
  const regionCode: string = RandomGenerator.alphabets(8).toUpperCase();
  const regionCreateBody = {
    code: regionCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: "blocked_test_region",
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // Validate that the region is linked to the expected country
  TestValidator.equals(
    "region.country.country_code should match created country_code",
    region.country.country_code,
    country.country_code,
  );

  // 4. Create a blocked shipping policy for this region
  const policyName: string = `blocked-${RandomGenerator.alphaNumeric(12)}`;
  const policyNotes: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });

  const shippingPolicyCreateBody = {
    policy_name: policyName,
    shipping_method_group: null,
    min_order_amount: null,
    max_order_amount: null,
    allows_cod: false,
    is_shipping_allowed: false,
    notes: policyNotes,
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const shippingPolicy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode: country.country_code,
        regionCode: region.code,
        body: shippingPolicyCreateBody,
      },
    );
  typia.assert(shippingPolicy);

  // 5. Business-level validations on the created policy
  TestValidator.equals(
    "created policy_name should match request",
    shippingPolicy.policy_name,
    policyName,
  );

  TestValidator.equals(
    "created policy notes should match request",
    shippingPolicy.notes,
    policyNotes,
  );

  TestValidator.predicate(
    "is_shipping_allowed should be false for blocked policy",
    shippingPolicy.is_shipping_allowed === false,
  );

  TestValidator.predicate(
    "allows_cod should be false when shipping is blocked and COD disabled",
    shippingPolicy.allows_cod === false,
  );

  TestValidator.equals(
    "min_order_amount should be null when shipping is fully blocked",
    shippingPolicy.min_order_amount,
    null,
  );

  TestValidator.equals(
    "max_order_amount should be null when shipping is fully blocked",
    shippingPolicy.max_order_amount,
    null,
  );

  TestValidator.equals(
    "effective_from should be null for indefinite blocked policy",
    shippingPolicy.effective_from,
    null,
  );

  TestValidator.equals(
    "effective_until should be null for indefinite blocked policy",
    shippingPolicy.effective_until,
    null,
  );

  TestValidator.equals(
    "region summary code on policy should match created region code",
    shippingPolicy.region.code,
    region.code,
  );

  TestValidator.equals(
    "region summary country_code on policy should match created country_code",
    shippingPolicy.region.country.country_code,
    country.country_code,
  );
}
