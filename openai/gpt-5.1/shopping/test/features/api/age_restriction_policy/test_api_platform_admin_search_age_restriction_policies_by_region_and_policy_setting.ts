import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate searching age restriction policies filtered by region and policy
 * setting.
 *
 * Business goal: Ensure that a platform administrator can create age
 * restriction policies associated with particular region and policy setting
 * configurations, then search them via the PATCH
 * /shoppingMall/platformAdmin/ageRestrictionPolicies endpoint using
 * regionSettingCode and policySettingCode filters. The listing must only
 * include policies whose associations match the requested region and policy
 * setting, excluding global or differently scoped policies, and the pagination
 * metadata must reflect the filtered result set.
 *
 * Flow:
 *
 * 1. Register (join) a platform admin so that the SDK attaches an Authorization
 *    header for subsequent platform-admin operations.
 * 2. Create two policy setting profiles with distinct business codes and category
 *    "age_restriction".
 * 3. Create two region settings with distinct business codes (e.g., REGION_US and
 *    REGION_EU).
 * 4. Seed a cancellation policy and a refund policy to simulate a realistic
 *    environment; these are not used in assertions but ensure other
 *    configuration tables are populated.
 * 5. Create three age restriction policies:
 *
 *    - PolicyMatched: bound to regionA and policySettingA.
 *    - PolicyOther: bound to regionB and policySettingB.
 *    - PolicyGlobal: not bound to any region/policySetting (global scope).
 * 6. Call the search endpoint with filters: regionSettingCode = regionA.code
 *    policySettingCode = policySettingA.code page = 1, limit = 10
 * 7. Assert that:
 *
 *    - All returned summaries have regionSetting defined and its code equals
 *         regionA.code.
 *    - All returned summaries have policySetting defined and its code equals
 *         policySettingA.code.
 *    - None of the summaries correspond to policyOther or policyGlobal.
 *    - Pagination metadata.records equals the count of policies matching those
 *         associations (here, 1), and pages is consistent with it and the
 *         requested limit.
 */
export async function test_api_platform_admin_search_age_restriction_policies_by_region_and_policy_setting(
  connection: api.IConnection,
) {
  // 1. Join as platform admin so that subsequent calls are authorized
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create two policy setting profiles (category: age_restriction)
  const policySettingACode = `age_profile_A_${RandomGenerator.alphaNumeric(6)}`;
  const policySettingBCode = `age_profile_B_${RandomGenerator.alphaNumeric(6)}`;

  const policySettingABody = {
    code: policySettingACode,
    name: "Age Restriction Profile A",
    category: "age_restriction",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.paragraph({ sentences: 6 }),
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySettingA: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: policySettingABody,
      },
    );
  typia.assert(policySettingA);

  const policySettingBBody = {
    code: policySettingBCode,
    name: "Age Restriction Profile B",
    category: "age_restriction",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.paragraph({ sentences: 6 }),
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySettingB: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: policySettingBBody,
      },
    );
  typia.assert(policySettingB);

  // 3. Create two region settings
  const regionACode = `REGION_A_${RandomGenerator.alphaNumeric(6)}`;
  const regionBCode = `REGION_B_${RandomGenerator.alphaNumeric(6)}`;

  const regionABody = {
    code: regionACode,
    name: "Region A",
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const regionA: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionABody,
      },
    );
  typia.assert(regionA);

  const regionBBody = {
    code: regionBCode,
    name: "Region B",
    iso_country_code: "DE",
    currency_code: "EUR",
    timezone: "Europe/Berlin",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const regionB: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionBBody,
      },
    );
  typia.assert(regionB);

  // 4. Seed cancellation and refund policies for realism
  const cancellationBody = {
    code: `cancel_${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: RandomGenerator.paragraph({ sentences: 5 }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: regionACode,
    policy_setting_code: policySettingACode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationBody },
    );
  typia.assert(cancellationPolicy);

  const refundBody = {
    code: `refund_${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.paragraph({ sentences: 5 }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: regionACode,
    policySettingCode: policySettingACode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundBody },
    );
  typia.assert(refundPolicy);

  // 5. Create age restriction policies with different associations
  // policyMatched: associated with regionA + policySettingA
  const agePolicyMatchedBody = {
    code: `AGE_MATCHED_${RandomGenerator.alphaNumeric(6)}`,
    name: "Age Restriction Matched",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    minimum_age_years: 18,
    require_verified_age: true,
    config_payload: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: regionA.id,
    policy_setting_id: policySettingA.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const policyMatched: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: agePolicyMatchedBody },
    );
  typia.assert(policyMatched);

  // policyOther: associated with regionB + policySettingB
  const agePolicyOtherBody = {
    code: `AGE_OTHER_${RandomGenerator.alphaNumeric(6)}`,
    name: "Age Restriction Other",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    minimum_age_years: 16,
    require_verified_age: false,
    config_payload: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: regionB.id,
    policy_setting_id: policySettingB.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const policyOther: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: agePolicyOtherBody },
    );
  typia.assert(policyOther);

  // policyGlobal: not associated with any region or policy setting
  const agePolicyGlobalBody = {
    code: `AGE_GLOBAL_${RandomGenerator.alphaNumeric(6)}`,
    name: "Age Restriction Global",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    minimum_age_years: 13,
    require_verified_age: false,
    config_payload: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: null,
    policy_setting_id: null,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const policyGlobal: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: agePolicyGlobalBody },
    );
  typia.assert(policyGlobal);

  // 6. Search with filters for regionA + policySettingA
  const searchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    regionSettingCode: regionACode,
    policySettingCode: policySettingACode,
    orderBy: "createdAt" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallAgeRestrictionPolicy.IRequest;

  const pageResult: IPageIShoppingMallAgeRestrictionPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.index(
      connection,
      { body: searchBody },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  const items: IShoppingMallAgeRestrictionPolicy.ISummary[] = pageResult.data;

  // 7. Validate that all results match regionA + policySettingA and exclude others
  for (const item of items) {
    typia.assert(item);
    TestValidator.predicate(
      "all items must be associated with regionA",
      item.regionSetting !== null &&
        item.regionSetting !== undefined &&
        item.regionSetting.code === regionACode,
    );
    TestValidator.predicate(
      "all items must be associated with policySettingA",
      item.policySetting !== null &&
        item.policySetting !== undefined &&
        item.policySetting.code === policySettingACode,
    );
  }

  const returnedIds = items.map((i) => i.id);
  TestValidator.predicate(
    "matched policy should be included in search results",
    returnedIds.includes(policyMatched.id),
  );
  TestValidator.predicate(
    "OTHER region/policy policy should be excluded",
    !returnedIds.includes(policyOther.id),
  );
  TestValidator.predicate(
    "GLOBAL policy without associations should be excluded",
    !returnedIds.includes(policyGlobal.id),
  );

  // We expect exactly one matched policy
  TestValidator.equals(
    "pagination records should equal number of matched policies (1)",
    pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages should be 1 when single record within limit",
    pagination.pages,
    1,
  );
}
