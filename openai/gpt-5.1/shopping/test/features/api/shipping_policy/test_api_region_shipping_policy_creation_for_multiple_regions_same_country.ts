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

export async function test_api_region_shipping_policy_creation_for_multiple_regions_same_country(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorized admin context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create a country under admin scope
  const countryCode = RandomGenerator.alphabets(3).toUpperCase();
  const countryBody = {
    country_code: countryCode,
    name_en: `Country-${countryCode}`,
    phone_code: "+99",
    is_active: true,
    sort_order: 1 satisfies number,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert<IShoppingMallCountry>(country);
  TestValidator.equals(
    "created country_code should match requested code",
    country.country_code,
    countryCode,
  );

  // 3. Create two regions under same country with different codes
  const regionCodeA = "REGION-A";
  const regionCodeB = "REGION-B";

  const regionABody = {
    code: regionCodeA,
    name_en: "Region A",
    region_type: "business",
    is_active: true,
    sort_order: 1 satisfies number,
  } satisfies IShoppingMallRegion.ICreate;

  const regionA: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionABody,
      },
    );
  typia.assert<IShoppingMallRegion>(regionA);
  TestValidator.equals(
    "regionA code should equal REGION-A",
    regionA.code,
    regionCodeA,
  );
  TestValidator.equals(
    "regionA country.code should equal parent countryCode",
    regionA.country.country_code,
    countryCode,
  );

  const regionBBody = {
    code: regionCodeB,
    name_en: "Region B",
    region_type: "business",
    is_active: true,
    sort_order: 2 satisfies number,
  } satisfies IShoppingMallRegion.ICreate;

  const regionB: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionBBody,
      },
    );
  typia.assert<IShoppingMallRegion>(regionB);
  TestValidator.equals(
    "regionB code should equal REGION-B",
    regionB.code,
    regionCodeB,
  );
  TestValidator.equals(
    "regionB country.code should equal parent countryCode",
    regionB.country.country_code,
    countryCode,
  );

  // 4. Create shipping policy for REGION-A with policy_name "UNIFIED-POLICY"
  const unifiedPolicyName = "UNIFIED-POLICY";

  const policyABody = {
    policy_name: unifiedPolicyName,
    shipping_method_group: "STANDARD",
    min_order_amount: 10,
    max_order_amount: 1000,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policyA: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode: regionCodeA,
        body: policyABody,
      },
    );
  typia.assert<IShoppingMallRegionShippingPolicy>(policyA);
  TestValidator.equals(
    "policyA.policy_name should equal UNIFIED-POLICY",
    policyA.policy_name,
    unifiedPolicyName,
  );
  TestValidator.equals(
    "policyA.region.code should equal REGION-A",
    policyA.region.code,
    regionCodeA,
  );

  // 5. Create shipping policy for REGION-B with same policy_name "UNIFIED-POLICY"
  const policyBBody = {
    policy_name: unifiedPolicyName,
    shipping_method_group: "STANDARD",
    min_order_amount: 20,
    max_order_amount: 2000,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policyB: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode: regionCodeB,
        body: policyBBody,
      },
    );
  typia.assert<IShoppingMallRegionShippingPolicy>(policyB);
  TestValidator.equals(
    "policyB.policy_name should equal UNIFIED-POLICY",
    policyB.policy_name,
    unifiedPolicyName,
  );
  TestValidator.equals(
    "policyB.region.code should equal REGION-B",
    policyB.region.code,
    regionCodeB,
  );

  // 6. Validate that policies are distinct and bound to different regions
  TestValidator.notEquals(
    "policyA and policyB should have different ids",
    policyA.id,
    policyB.id,
  );
  TestValidator.notEquals(
    "policyA and policyB should have different shopping_mall_region_id",
    policyA.shopping_mall_region_id,
    policyB.shopping_mall_region_id,
  );

  TestValidator.equals(
    "policyA.region.country.country_code should match parent countryCode",
    policyA.region.country.country_code,
    countryCode,
  );
  TestValidator.equals(
    "policyB.region.country.country_code should match parent countryCode",
    policyB.region.country.country_code,
    countryCode,
  );
}
