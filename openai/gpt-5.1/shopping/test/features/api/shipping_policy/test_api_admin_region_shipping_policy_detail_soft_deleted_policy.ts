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

export async function test_api_admin_region_shipping_policy_detail_soft_deleted_policy(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country
  const countryCreateBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.name(1),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 3. Create a region under the country
  const regionCreateBody = {
    code: RandomGenerator.alphaNumeric(5),
    name_en: RandomGenerator.name(1),
    region_type: "test-region",
    is_active: true,
    sort_order: 1,
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

  // 4. Create two shipping policies: one active, one disabled
  const activePolicyCreateBody = {
    policy_name: "Active Policy - " + RandomGenerator.name(1),
    shipping_method_group: "STANDARD",
    min_order_amount: 10,
    max_order_amount: 1000,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const activePolicy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode: country.country_code,
        regionCode: region.code,
        body: activePolicyCreateBody,
      },
    );
  typia.assert(activePolicy);

  const disabledPolicyCreateBody = {
    policy_name: "Disabled Policy - " + RandomGenerator.name(1),
    shipping_method_group: "RESTRICTED",
    min_order_amount: null,
    max_order_amount: null,
    allows_cod: false,
    is_shipping_allowed: false,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const disabledPolicy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode: country.country_code,
        regionCode: region.code,
        body: disabledPolicyCreateBody,
      },
    );
  typia.assert(disabledPolicy);

  // 5. Retrieve details for both policies via GET detail endpoint
  const activeDetail: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.at(
      connection,
      {
        countryCode: country.country_code,
        regionCode: region.code,
        policyId: activePolicy.id,
      },
    );
  typia.assert(activeDetail);

  const disabledDetail: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.at(
      connection,
      {
        countryCode: country.country_code,
        regionCode: region.code,
        policyId: disabledPolicy.id,
      },
    );
  typia.assert(disabledDetail);

  // 6. Business assertions
  // 6-1. IDs and basic integrity
  TestValidator.equals(
    "active policy id should match between create and detail",
    activeDetail.id,
    activePolicy.id,
  );
  TestValidator.equals(
    "disabled policy id should match between create and detail",
    disabledDetail.id,
    disabledPolicy.id,
  );

  // 6-2. Region linkage
  TestValidator.equals(
    "active policy region id should match created region",
    activeDetail.shopping_mall_region_id,
    region.id,
  );
  TestValidator.equals(
    "disabled policy region id should match created region",
    disabledDetail.shopping_mall_region_id,
    region.id,
  );

  TestValidator.equals(
    "active policy region code should match created region code",
    activeDetail.region.code,
    region.code,
  );
  TestValidator.equals(
    "disabled policy region code should match created region code",
    disabledDetail.region.code,
    region.code,
  );

  TestValidator.equals(
    "active policy region country code should match created country code",
    activeDetail.region.country.country_code,
    country.country_code,
  );
  TestValidator.equals(
    "disabled policy region country code should match created country code",
    disabledDetail.region.country.country_code,
    country.country_code,
  );

  // 6-3. is_shipping_allowed semantics
  TestValidator.equals(
    "active policy must allow shipping",
    activeDetail.is_shipping_allowed,
    true,
  );
  TestValidator.equals(
    "disabled policy must disallow shipping",
    disabledDetail.is_shipping_allowed,
    false,
  );

  // 6-4. Other field consistency between create and detail
  TestValidator.equals(
    "active policy name should match",
    activeDetail.policy_name,
    activePolicyCreateBody.policy_name,
  );
  TestValidator.equals(
    "disabled policy name should match",
    disabledDetail.policy_name,
    disabledPolicyCreateBody.policy_name,
  );

  TestValidator.equals(
    "active policy COD flag should match",
    activeDetail.allows_cod,
    activePolicyCreateBody.allows_cod,
  );
  TestValidator.equals(
    "disabled policy COD flag should match",
    disabledDetail.allows_cod,
    disabledPolicyCreateBody.allows_cod,
  );

  TestValidator.equals(
    "active policy min order amount should match",
    activeDetail.min_order_amount,
    activePolicyCreateBody.min_order_amount,
  );
  TestValidator.equals(
    "active policy max order amount should match",
    activeDetail.max_order_amount,
    activePolicyCreateBody.max_order_amount,
  );

  TestValidator.equals(
    "disabled policy min order amount should match",
    disabledDetail.min_order_amount,
    disabledPolicyCreateBody.min_order_amount,
  );
  TestValidator.equals(
    "disabled policy max order amount should match",
    disabledDetail.max_order_amount,
    disabledPolicyCreateBody.max_order_amount,
  );

  TestValidator.equals(
    "active policy notes should match",
    activeDetail.notes,
    activePolicyCreateBody.notes,
  );
  TestValidator.equals(
    "disabled policy notes should match",
    disabledDetail.notes,
    disabledPolicyCreateBody.notes,
  );

  TestValidator.equals(
    "active policy shipping method group should match",
    activeDetail.shipping_method_group,
    activePolicyCreateBody.shipping_method_group,
  );
  TestValidator.equals(
    "disabled policy shipping method group should match",
    disabledDetail.shipping_method_group,
    disabledPolicyCreateBody.shipping_method_group,
  );

  // 6-5. Ensure the two policies are actually distinct
  TestValidator.notEquals(
    "active and disabled policy ids must differ",
    activeDetail.id,
    disabledDetail.id,
  );
  TestValidator.notEquals(
    "active and disabled policy names must differ",
    activeDetail.policy_name,
    disabledDetail.policy_name,
  );
}
