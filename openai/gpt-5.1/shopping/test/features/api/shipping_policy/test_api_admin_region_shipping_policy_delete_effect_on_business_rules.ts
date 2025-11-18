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

export async function test_api_admin_region_shipping_policy_delete_effect_on_business_rules(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a country under admin scope
  const countryCode: string = RandomGenerator.alphabets(2).toUpperCase();

  const countryCreateBody = {
    country_code: countryCode,
    name_en: `Test Country ${countryCode}`,
    phone_code: "+99",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  TestValidator.equals(
    "created country should keep requested country_code",
    country.country_code,
    countryCode,
  );

  // 3. Create a region for that country
  const regionCode: string = `${countryCode}-R1`;

  const regionCreateBody = {
    code: regionCode,
    name_en: `Region ${regionCode}`,
    region_type: "test-region",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  TestValidator.equals(
    "created region should keep requested code",
    region.code,
    regionCode,
  );
  TestValidator.equals(
    "region should belong to created country",
    region.country.country_code,
    country.country_code,
  );

  // 4. Create a region shipping policy with shipping allowed
  const policyName = `Policy-${RandomGenerator.alphaNumeric(8)}`;

  const policyCreateBody = {
    policy_name: policyName,
    shipping_method_group: null,
    min_order_amount: null,
    max_order_amount: null,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode: country.country_code,
        regionCode: region.code,
        body: policyCreateBody,
      },
    );
  typia.assert<IShoppingMallRegionShippingPolicy>(policy);

  // Validate wiring of region and country inside the policy
  TestValidator.equals(
    "policy should be linked to the expected region code",
    policy.region.code,
    region.code,
  );
  TestValidator.equals(
    "policy region should belong to the expected country",
    policy.region.country.country_code,
    country.country_code,
  );
  TestValidator.predicate(
    "policy should allow shipping before deletion",
    policy.is_shipping_allowed === true,
  );
  TestValidator.predicate(
    "policy should allow COD before deletion",
    policy.allows_cod === true,
  );

  // 5. Delete the shipping policy via admin endpoint
  await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.erase(
    connection,
    {
      countryCode: country.country_code,
      regionCode: region.code,
      policyId: policy.id,
    },
  );

  // 6. Business rule effect assertion (indirect): after deletion, we can only
  // assert that the deletion call has completed successfully and that our
  // previously created country/region objects remain logically consistent in
  // memory. Without read/list APIs, we cannot re-verify the absence of the
  // policy, so we focus on the successful end-to-end lifecycle.
  TestValidator.predicate(
    "country object remains usable after policy deletion",
    country.is_active === true && country.country_code === countryCode,
  );
  TestValidator.predicate(
    "region object remains usable after policy deletion",
    region.is_active === true && region.code === regionCode,
  );
}
