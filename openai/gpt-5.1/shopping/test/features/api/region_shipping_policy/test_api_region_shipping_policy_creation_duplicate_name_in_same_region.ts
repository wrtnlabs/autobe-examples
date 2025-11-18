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
 * Validate that region-level shipping policies enforce unique policy_name
 * within the same region.
 *
 * Business context:
 *
 * - Region shipping policies are scoped by region (countryCode + regionCode).
 * - Database-level constraint (shopping_mall_region_id, policy_name) must prevent
 *   duplicates.
 *
 * Steps:
 *
 * 1. Join an admin account using POST /auth/admin/join to acquire admin context.
 * 2. As this admin, create a country via POST /shoppingMall/admin/countries.
 * 3. Under that country, create a region via POST
 *    /shoppingMall/admin/countries/{countryCode}/regions.
 * 4. For that region, create a shipping policy named "STANDARD-POLICY".
 * 5. Attempt to create a second shipping policy in the same region with the same
 *    name "STANDARD-POLICY".
 * 6. Assert: first call succeeds; second call raises an error (business rule
 *    violation for duplicate name).
 */
export async function test_api_region_shipping_policy_creation_duplicate_name_in_same_region(
  connection: api.IConnection,
) {
  // 1. Admin join and authentication (SDK will set Authorization header)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a country for the region and shipping policies
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();

  const countryBody = {
    country_code: countryCode,
    name_en: RandomGenerator.name(2),
    phone_code: null,
    is_active: true,
    sort_order: 1 satisfies number,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  TestValidator.equals(
    "created country_code must match request body",
    country.country_code,
    countryCode,
  );

  // 3. Create a region under that country
  const regionCode = RandomGenerator.alphabets(5).toUpperCase();

  const regionBody = {
    code: regionCode,
    name_en: RandomGenerator.name(2),
    region_type: null,
    is_active: true,
    sort_order: 1 satisfies number,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  TestValidator.equals(
    "created region code must match request body",
    region.code,
    regionCode,
  );
  TestValidator.equals(
    "region.country.country_code must match parent countryCode",
    region.country.country_code,
    countryCode,
  );

  // 4. Create the first shipping policy with name "STANDARD-POLICY"
  const policyName = "STANDARD-POLICY" as const;
  const now = new Date();
  const effectiveFrom = new Date(now.getTime()).toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const firstPolicyBody = {
    policy_name: policyName,
    shipping_method_group: null,
    min_order_amount: null,
    max_order_amount: null,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 5 }),
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const firstPolicy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode,
        body: firstPolicyBody,
      },
    );
  typia.assert<IShoppingMallRegionShippingPolicy>(firstPolicy);

  TestValidator.equals(
    "first policy name must equal STANDARD-POLICY",
    firstPolicy.policy_name,
    policyName,
  );
  TestValidator.equals(
    "first policy region.code must match regionCode",
    firstPolicy.region.code,
    regionCode,
  );
  TestValidator.equals(
    "first policy region.country.country_code must match countryCode",
    firstPolicy.region.country.country_code,
    countryCode,
  );

  // 5. Attempt to create second policy with the same name in the same region
  const secondPolicyBody = {
    policy_name: policyName,
    shipping_method_group: null,
    min_order_amount: null,
    max_order_amount: null,
    allows_cod: true,
    is_shipping_allowed: true,
    // Different notes and effective window to ensure failure is name-based, not content-based
    notes: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: new Date(
      now.getTime() + 2 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    effective_until: new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  await TestValidator.error(
    "duplicate policy_name within same region must fail",
    async () => {
      await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
        connection,
        {
          countryCode,
          regionCode,
          body: secondPolicyBody,
        },
      );
    },
  );
}
