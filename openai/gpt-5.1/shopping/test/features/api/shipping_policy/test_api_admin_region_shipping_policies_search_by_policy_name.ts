import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRegionShippingPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRegionShippingPolicy";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRegionShippingPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionShippingPolicy";

/**
 * Validate searching region shipping policies by policy_name for a specific
 * admin-scoped region.
 *
 * Business flow:
 *
 * 1. Register an admin and implicitly obtain an authorization token.
 * 2. Create a country.
 * 3. Create two regions under that country: a target region and a different
 *    region.
 * 4. Under the target region, create three shipping policies with distinct
 *    policy_name values:
 *
 *    - "Standard Shipping"
 *    - "Express Shipping"
 *    - "Standard Free Over Threshold"
 * 5. Under the other region, create a policy whose name also contains the word
 *    "Standard" to prove region scoping.
 * 6. Call the admin search endpoint with policy_name filter "Standard" and a limit
 *    that can contain all matches.
 * 7. Assert that only the two target-region policies whose names contain
 *    "Standard" are returned and that the Express-only policy is excluded.
 * 8. Assert that the policy in the other region is not returned, validating
 *    correct region scoping.
 * 9. Verify pagination metadata (records and data.length alignment) and that
 *    requesting a narrower policy_name (e.g., the full name of one policy)
 *    returns exactly one record.
 */
export async function test_api_admin_region_shipping_policies_search_by_policy_name(
  connection: api.IConnection,
) {
  // 1. Register admin and obtain token
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
  typia.assert(adminAuthorized);

  // 2. Create a country
  const countryCode = "CTY-" + RandomGenerator.alphaNumeric(6);
  const countryCreateBody = {
    country_code: countryCode,
    name_en: "Test Country " + RandomGenerator.name(1),
    phone_code: "+" + RandomGenerator.alphaNumeric(3),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);
  TestValidator.equals(
    "created country_code should match",
    country.country_code,
    countryCode,
  );

  // 3. Create target region under that country
  const targetRegionCode = "REG-TGT-" + RandomGenerator.alphaNumeric(4);
  const targetRegionBody = {
    code: targetRegionCode,
    name_en: "Target Region " + RandomGenerator.name(1),
    region_type: "test-region",
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IShoppingMallRegion.ICreate;

  const targetRegion: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: targetRegionBody,
      },
    );
  typia.assert(targetRegion);
  TestValidator.equals(
    "target region code should match",
    targetRegion.code,
    targetRegionCode,
  );

  // 3b. Create another region under same country (for negative scope check)
  const otherRegionCode = "REG-OTH-" + RandomGenerator.alphaNumeric(4);
  const otherRegionBody = {
    code: otherRegionCode,
    name_en: "Other Region " + RandomGenerator.name(1),
    region_type: "test-region",
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IShoppingMallRegion.ICreate;

  const otherRegion: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: otherRegionBody,
      },
    );
  typia.assert(otherRegion);
  TestValidator.equals(
    "other region code should match",
    otherRegion.code,
    otherRegionCode,
  );

  // 4. Create three policies under target region
  const standardPolicyName1 = "Standard Shipping";
  const expressPolicyName = "Express Shipping";
  const standardPolicyName2 = "Standard Free Over Threshold";

  const policyStandard1Body = {
    policy_name: standardPolicyName1,
    shipping_method_group: "STD-GRP-" + RandomGenerator.alphaNumeric(4),
    min_order_amount: 0,
    max_order_amount: 100000,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policyStandard1: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode: targetRegionCode,
        body: policyStandard1Body,
      },
    );
  typia.assert(policyStandard1);

  const policyExpressBody = {
    policy_name: expressPolicyName,
    shipping_method_group: "EXP-GRP-" + RandomGenerator.alphaNumeric(4),
    min_order_amount: 0,
    max_order_amount: 200000,
    allows_cod: false,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policyExpress: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode: targetRegionCode,
        body: policyExpressBody,
      },
    );
  typia.assert(policyExpress);

  const policyStandard2Body = {
    policy_name: standardPolicyName2,
    shipping_method_group: "STD2-GRP-" + RandomGenerator.alphaNumeric(4),
    min_order_amount: 50000,
    max_order_amount: 300000,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 4 }),
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policyStandard2: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode: targetRegionCode,
        body: policyStandard2Body,
      },
    );
  typia.assert(policyStandard2);

  // 5. Create one policy in other region that also contains "Standard" in name
  const otherRegionStandardName = "Standard Other Region";
  const otherRegionPolicyBody = {
    policy_name: otherRegionStandardName,
    shipping_method_group: "OTH-GRP-" + RandomGenerator.alphaNumeric(4),
    min_order_amount: null,
    max_order_amount: null,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const otherRegionPolicy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode: otherRegionCode,
        body: otherRegionPolicyBody,
      },
    );
  typia.assert(otherRegionPolicy);

  // 6. Search with policy_name filter "Standard" scoped to target region
  const searchFilter = "Standard";
  const searchRequestBody = {
    page: 0,
    limit: 10,
    policy_name: searchFilter,
    is_shipping_allowed: null,
    allows_cod: null,
    effective_from_from: null,
    effective_from_to: null,
    effective_until_from: null,
    effective_until_to: null,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallRegionShippingPolicy.IRequest;

  const pageStandard: IPageIShoppingMallRegionShippingPolicy.ISummary =
    await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.index(
      connection,
      {
        countryCode,
        regionCode: targetRegionCode,
        body: searchRequestBody,
      },
    );
  typia.assert(pageStandard);

  const paginationStandard: IPage.IPagination = pageStandard.pagination;
  TestValidator.equals(
    "policy_name 'Standard' search: records should equal data length",
    paginationStandard.records,
    pageStandard.data.length,
  );

  // Expect exactly the two Standard* policies from target region
  TestValidator.equals(
    "policy_name 'Standard' search should return 2 policies",
    pageStandard.data.length,
    2,
  );

  const returnedNames = pageStandard.data.map((p) => p.policy_name);
  TestValidator.predicate(
    "all returned policies should contain the substring 'Standard'",
    returnedNames.every((name) => name.includes(searchFilter)),
  );

  TestValidator.predicate(
    "Express policy should not be included in 'Standard' search",
    !returnedNames.includes(expressPolicyName),
  );

  TestValidator.predicate(
    "Other region 'Standard' policy should not be included in target region search",
    !returnedNames.includes(otherRegionStandardName),
  );

  // 8. Narrow search to one specific policy by full name
  const narrowSearchBody = {
    page: 0,
    limit: 10,
    policy_name: standardPolicyName1,
    is_shipping_allowed: null,
    allows_cod: null,
    effective_from_from: null,
    effective_from_to: null,
    effective_until_from: null,
    effective_until_to: null,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallRegionShippingPolicy.IRequest;

  const pageNarrow: IPageIShoppingMallRegionShippingPolicy.ISummary =
    await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.index(
      connection,
      {
        countryCode,
        regionCode: targetRegionCode,
        body: narrowSearchBody,
      },
    );
  typia.assert(pageNarrow);

  const narrowPagination: IPage.IPagination = pageNarrow.pagination;
  TestValidator.equals(
    "narrow policy_name search: records should equal data length",
    narrowPagination.records,
    pageNarrow.data.length,
  );

  TestValidator.equals(
    "narrow policy_name search should return exactly one policy",
    pageNarrow.data.length,
    1,
  );

  TestValidator.equals(
    "returned policy_name should equal the requested full name",
    pageNarrow.data[0]?.policy_name,
    standardPolicyName1,
  );
}
