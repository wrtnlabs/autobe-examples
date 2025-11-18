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

export async function test_api_region_shipping_policy_creation_minimal_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.join",
    referrer: "https://admin.test.referrer",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a country
  const countryCode: string = `CC_${RandomGenerator.alphaNumeric(6)}`;
  const countryBody = {
    country_code: countryCode,
    name_en: "Test Country",
    phone_code: "+999",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  TestValidator.equals(
    "country_code should persist as sent",
    country.country_code,
    countryCode,
  );
  TestValidator.equals(
    "country is_active should be true",
    country.is_active,
    true,
  );

  // 3. Create a region under that country
  const regionCode: string = `RC_${RandomGenerator.alphaNumeric(6)}`;
  const regionBody = {
    code: regionCode,
    name_en: "Test Region",
    region_type: "test-region-type",
    is_active: true,
    sort_order: 10,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionBody,
      },
    );
  typia.assert(region);

  TestValidator.equals(
    "region code should persist as sent",
    region.code,
    regionCode,
  );
  TestValidator.equals(
    "region is_active should be true",
    region.is_active,
    true,
  );

  // 4. Create minimal region shipping policy
  const policyName: string = `POLICY_${RandomGenerator.alphaNumeric(8)}`;
  const policyBody = {
    policy_name: policyName,
    shipping_method_group: null,
    min_order_amount: null,
    max_order_amount: null,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: null,
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode,
        body: policyBody,
      },
    );
  typia.assert(policy);

  // 5. Business assertions on created policy
  TestValidator.equals(
    "policy_name should persist as sent",
    policy.policy_name,
    policyName,
  );
  TestValidator.equals("allows_cod should be true", policy.allows_cod, true);
  TestValidator.equals(
    "is_shipping_allowed should be true",
    policy.is_shipping_allowed,
    true,
  );

  // Region linkage
  TestValidator.equals(
    "policy region id should equal created region id",
    policy.shopping_mall_region_id,
    region.id,
  );
  TestValidator.equals(
    "policy.region.code should equal region code",
    policy.region.code,
    region.code,
  );
  TestValidator.equals(
    "policy.region.name_en should equal region name",
    policy.region.name_en,
    region.name_en,
  );
  TestValidator.equals(
    "policy.region.is_active should equal region is_active",
    policy.region.is_active,
    region.is_active,
  );
  TestValidator.equals(
    "policy.region.sort_order should equal region sort_order",
    policy.region.sort_order,
    region.sort_order,
  );

  // Nested country summary alignment
  TestValidator.equals(
    "policy.region.country.country_code should equal country_code",
    policy.region.country.country_code,
    country.country_code,
  );
  TestValidator.equals(
    "policy.region.country.is_active should equal country is_active",
    policy.region.country.is_active,
    country.is_active,
  );

  // deleted_at must be null for a freshly created policy
  TestValidator.equals(
    "new policy deleted_at should be null",
    policy.deleted_at,
    null,
  );
}
