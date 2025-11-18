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
 * Validate that deleting a region shipping policy with mismatched
 * country/region path parameters fails for an authenticated admin.
 *
 * Business context: Region-level shipping policies are scoped by their owning
 * country and region. Even if an admin knows a policyId, they must address it
 * through the correct (countryCode, regionCode) path. This test ensures that
 * using a different, but valid, country/region combination with the same
 * policyId results in an error rather than deleting or touching the policy.
 *
 * Steps:
 *
 * 1. Admin joins the platform and becomes authenticated.
 * 2. Admin creates Country A.
 * 3. Admin creates Region A1 under Country A.
 * 4. Admin creates a region shipping policy under Country A / Region A1.
 * 5. Admin creates Country B and Region B1 (a separate valid scope).
 * 6. Admin attempts to delete the policy created for A/A1 using the path
 *    /shoppingMall/admin/countries/{countryBCode}/regions/{regionB1Code}/shippingPolicies/{policyId}.
 * 7. Assert that this delete attempt fails (throws), demonstrating that policy
 *    deletion is properly constrained by (countryCode, regionCode) and cannot
 *    cross scopes.
 */
export async function test_api_admin_region_shipping_policy_delete_wrong_country_or_region(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
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

  // 2. Create Country A
  const countryABody = {
    country_code: "CTRY-A",
    name_en: "Country A",
    phone_code: "+100",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const countryA: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryABody,
    });
  typia.assert(countryA);

  // 3. Create Region A1 under Country A
  const regionA1Body = {
    code: "REG-A1",
    name_en: "Region A1",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const regionA1: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryA.country_code,
        body: regionA1Body,
      },
    );
  typia.assert(regionA1);

  // 4. Create shipping policy under Country A / Region A1
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const policyABody = {
    policy_name: "Policy-A-A1",
    shipping_method_group: "STANDARD",
    min_order_amount: 10,
    max_order_amount: 1000,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 5 }),
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policyA: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode: countryA.country_code,
        regionCode: regionA1.code,
        body: policyABody,
      },
    );
  typia.assert(policyA);

  // 5. Create Country B and Region B1
  const countryBBody = {
    country_code: "CTRY-B",
    name_en: "Country B",
    phone_code: "+200",
    is_active: true,
    sort_order: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const countryB: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBBody,
    });
  typia.assert(countryB);

  const regionB1Body = {
    code: "REG-B1",
    name_en: "Region B1",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const regionB1: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryB.country_code,
        body: regionB1Body,
      },
    );
  typia.assert(regionB1);

  // 6. Attempt to delete the policy using mismatched country/region (B/B1)
  await TestValidator.error(
    "deleting policy with mismatched country/region should fail",
    async () => {
      await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.erase(
        connection,
        {
          countryCode: countryB.country_code,
          regionCode: regionB1.code,
          policyId: policyA.id,
        },
      );
    },
  );
}
